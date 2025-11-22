-- ============================================
-- Comprehensive Fix for Messaging Issues
-- Fixes both message sending and conversation creation
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: Fix Direct Message Participants RLS
-- ============================================

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Users can join conversations" ON public.direct_message_participants;

-- Create a helper function to check participant count (excluding the row being inserted)
CREATE OR REPLACE FUNCTION public.check_direct_message_participant_count(
  p_conversation_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_type TEXT;
  v_existing_count INTEGER;
BEGIN
  -- Get conversation type
  SELECT type INTO v_type
  FROM public.direct_messages
  WHERE id = p_conversation_id;
  
  -- If conversation doesn't exist yet, allow (shouldn't happen, but safety check)
  IF v_type IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- If group, always allow
  IF v_type = 'group' THEN
    RETURN TRUE;
  END IF;
  
  -- For direct messages, count existing participants (excluding the one being inserted)
  SELECT count(*) INTO v_existing_count
  FROM public.direct_message_participants
  WHERE conversation_id = p_conversation_id
  AND user_id != p_user_id;
  
  -- Allow if less than 2 existing participants (so we can have max 2 total)
  RETURN v_existing_count < 2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the INSERT policy using the helper function
CREATE POLICY "Users can join conversations"
  ON public.direct_message_participants FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND public.check_direct_message_participant_count(
      direct_message_participants.conversation_id,
      direct_message_participants.user_id
    )
  );

-- ============================================
-- PART 2: Fix Messages RLS Policies
-- ============================================

-- Drop existing message policies
DROP POLICY IF EXISTS "Users can view messages in accessible channels or conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in accessible channels or conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in accessible channels" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in accessible channels" ON public.messages;

-- Create fixed SELECT policy with proper NULL handling
CREATE POLICY "Users can view messages in accessible channels or conversations"
  ON public.messages FOR SELECT
  USING (
    -- Channel messages (existing logic) - only check if channel_id is not null
    (
      channel_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM public.channels
        WHERE channels.id = messages.channel_id
        AND EXISTS (
          SELECT 1 FROM public.servers
          WHERE servers.id = channels.server_id
          AND (
            servers.is_public = true
            OR (auth.uid() IS NOT NULL AND servers.owner_id = auth.uid())
            OR (
              auth.uid() IS NOT NULL
              AND EXISTS (
                SELECT 1 FROM public.server_members
                WHERE server_members.server_id = servers.id
                AND server_members.user_id = auth.uid()
              )
            )
          )
        )
      )
    )
    -- OR conversation messages (new logic) - only check if conversation_id is not null
    OR (
      conversation_id IS NOT NULL
      AND auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.direct_message_participants
        WHERE direct_message_participants.conversation_id = messages.conversation_id
        AND direct_message_participants.user_id = auth.uid()
      )
    )
  );

-- Create fixed INSERT policy with proper NULL handling
-- Explicitly check that only one of channel_id or conversation_id is set
CREATE POLICY "Users can send messages in accessible channels or conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND (
      -- Channel messages (existing logic) - must have channel_id and NOT conversation_id
      (
        channel_id IS NOT NULL
        AND conversation_id IS NULL
        AND EXISTS (
          SELECT 1 FROM public.channels
          WHERE channels.id = messages.channel_id
          AND channels.type = 'text'
          AND EXISTS (
            SELECT 1 FROM public.servers
            WHERE servers.id = channels.server_id
            AND (
              servers.is_public = true
              OR servers.owner_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.server_members
                WHERE server_members.server_id = servers.id
                AND server_members.user_id = auth.uid()
              )
            )
          )
        )
      )
      -- OR conversation messages (new logic) - must have conversation_id and NOT channel_id
      OR (
        conversation_id IS NOT NULL
        AND channel_id IS NULL
        AND EXISTS (
          SELECT 1 FROM public.direct_message_participants
          WHERE direct_message_participants.conversation_id = messages.conversation_id
          AND direct_message_participants.user_id = auth.uid()
        )
      )
    )
  );

-- ============================================
-- PART 3: Verification
-- ============================================

-- Check that policies exist
SELECT 'direct_message_participants policies: ' || count(*)::text 
FROM pg_policies WHERE tablename = 'direct_message_participants';

SELECT 'messages policies: ' || count(*)::text 
FROM pg_policies WHERE tablename = 'messages';

-- Check that the helper function exists
SELECT 'Helper function exists: ' || CASE 
  WHEN EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'check_direct_message_participant_count'
  ) THEN 'YES' 
  ELSE 'NO' 
END;


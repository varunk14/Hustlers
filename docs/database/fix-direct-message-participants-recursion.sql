-- ============================================
-- Fix Infinite Recursion in direct_message_participants RLS Policy
-- This fixes the "infinite recursion detected" error
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- Step 1: Drop the problematic policy
-- ============================================
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.direct_message_participants;

-- ============================================
-- Step 2: Create a fixed SELECT policy without recursion
-- The key is: don't query direct_message_participants from within its own policy
-- ============================================
CREATE POLICY "Users can view participants of their conversations"
  ON public.direct_message_participants FOR SELECT
  USING (
    -- Simple: users can see participants where they are the participant
    -- OR they can see all participants in conversations they're part of
    -- But we can't check if they're part of it by querying this table (recursion!)
    -- So we'll use a simpler approach: allow seeing participants where user_id matches
    -- For seeing other participants, we'll need to check via direct_messages or use a function
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- ============================================
-- Step 3: Alternative - Use SECURITY DEFINER function for complex checks
-- This allows checking if user is in conversation without recursion
-- ============================================

-- Create a helper function to check if user is participant (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_conversation_participant(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.direct_message_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now update the policy to use the function for seeing other participants
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.direct_message_participants;

CREATE POLICY "Users can view participants of their conversations"
  ON public.direct_message_participants FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- User can see their own participation
      user_id = auth.uid()
      -- OR user can see other participants if they're also in the conversation
      OR public.is_conversation_participant(conversation_id, auth.uid())
    )
  );

-- ============================================
-- Step 4: Also fix the INSERT policy if it has recursion issues
-- ============================================

-- Check if INSERT policy has recursion (it does - line 143-145 checks direct_message_participants)
DROP POLICY IF EXISTS "Users can join conversations" ON public.direct_message_participants;

-- Create a helper function to check participant count
CREATE OR REPLACE FUNCTION public.get_conversation_participant_count(p_conversation_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT count(*)::INTEGER
    FROM public.direct_message_participants
    WHERE conversation_id = p_conversation_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create fixed INSERT policy using the helper function
CREATE POLICY "Users can join conversations"
  ON public.direct_message_participants FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND (
      -- For direct messages (1:1), only allow if conversation has < 2 participants
      EXISTS (
        SELECT 1 FROM public.direct_messages
        WHERE direct_messages.id = direct_message_participants.conversation_id
        AND direct_messages.type = 'direct'
        AND public.get_conversation_participant_count(direct_message_participants.conversation_id) < 2
      )
      -- For group messages, allow joining
      OR EXISTS (
        SELECT 1 FROM public.direct_messages
        WHERE direct_messages.id = direct_message_participants.conversation_id
        AND direct_messages.type = 'group'
      )
    )
  );

-- ============================================
-- Verification
-- ============================================
SELECT 'direct_message_participants policies: ' || count(*)::text 
FROM pg_policies 
WHERE tablename = 'direct_message_participants';

SELECT 'Helper functions created: ' || CASE 
  WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_conversation_participant') 
    AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_conversation_participant_count')
  THEN 'YES'
  ELSE 'NO'
END;


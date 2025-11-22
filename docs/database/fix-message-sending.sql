-- ============================================
-- Fix Message Sending Issues
-- This script fixes RLS policies and ensures schema is correct
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: Update Messages Table Schema (if needed)
-- ============================================

-- Make channel_id nullable (if not already)
DO $$
BEGIN
  -- Check if channel_id is currently NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'channel_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.messages ALTER COLUMN channel_id DROP NOT NULL;
  END IF;
END $$;

-- Add conversation_id column if it doesn't exist
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.direct_messages(id) ON DELETE CASCADE;

-- Add constraint: either channel_id or conversation_id must be set, but not both
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_channel_or_conversation_check;

ALTER TABLE public.messages
ADD CONSTRAINT messages_channel_or_conversation_check 
CHECK (
  (channel_id IS NOT NULL AND conversation_id IS NULL) OR
  (channel_id IS NULL AND conversation_id IS NOT NULL)
);

-- ============================================
-- PART 2: Fix RLS Policies for Messages
-- ============================================

-- Drop all existing message policies
DROP POLICY IF EXISTS "Users can view messages in accessible channels or conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in accessible channels or conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in accessible channels" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in accessible channels" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

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

-- UPDATE policy: Users can update their own messages
CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND auth.uid() = user_id
  );

-- DELETE policy: Users can delete their own messages
-- Also allow server owners/admins to delete any message in their servers
CREATE POLICY "Users can delete their own messages"
  ON public.messages FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- User can delete their own messages
      auth.uid() = user_id
      -- OR server owner/admin can delete any message in channels
      OR (
        channel_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.channels
          WHERE channels.id = messages.channel_id
          AND EXISTS (
            SELECT 1 FROM public.servers
            WHERE servers.id = channels.server_id
            AND (
              servers.owner_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.server_members
                WHERE server_members.server_id = servers.id
                AND server_members.user_id = auth.uid()
                AND server_members.role IN ('owner', 'admin')
              )
            )
          )
        )
      )
    )
  );

-- ============================================
-- PART 3: Create Indexes (if needed)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON public.messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at ON public.messages(conversation_id, created_at DESC);

-- ============================================
-- PART 4: Verification
-- ============================================

-- Check that policies exist
SELECT 'messages policies: ' || count(*)::text 
FROM pg_policies WHERE tablename = 'messages';

-- Check table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'messages'
ORDER BY ordinal_position;

-- Check constraint exists
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND table_name = 'messages'
AND constraint_name = 'messages_channel_or_conversation_check';


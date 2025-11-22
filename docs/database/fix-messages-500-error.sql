-- ============================================
-- Fix 500 Internal Server Error on Messages Table
-- This fixes the 500 errors on GET and POST /rest/v1/messages
-- Run this entire script in Supabase SQL Editor
-- ============================================

-- ============================================
-- Step 1: Ensure handle_updated_at function exists
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Step 2: Fix messages table structure
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

-- Drop and recreate constraint to ensure exactly one of channel_id or conversation_id is set
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_channel_or_conversation_check;

ALTER TABLE public.messages
ADD CONSTRAINT messages_channel_or_conversation_check 
CHECK (
  (channel_id IS NOT NULL AND conversation_id IS NULL) OR
  (channel_id IS NULL AND conversation_id IS NOT NULL)
);

-- ============================================
-- Step 3: Drop ALL existing policies to start fresh
-- ============================================
DROP POLICY IF EXISTS "Users can view messages in accessible channels or conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in accessible channels or conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in accessible channels" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in accessible channels" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

-- ============================================
-- Step 4: Create fixed SELECT policy with proper NULL handling
-- ============================================
CREATE POLICY "Users can view messages in accessible channels or conversations"
  ON public.messages FOR SELECT
  USING (
    -- Channel messages - only check if channel_id is not null
    (
      channel_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM public.channels
        WHERE channels.id = messages.channel_id
        AND EXISTS (
          SELECT 1 FROM public.servers
          WHERE servers.id = channels.server_id
          AND (
            -- Public servers are visible to everyone
            servers.is_public = true
            -- OR user owns the server (only if authenticated)
            OR (auth.uid() IS NOT NULL AND servers.owner_id = auth.uid())
            -- OR user is a member (only if authenticated)
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
    -- OR conversation messages - only check if conversation_id is not null
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

-- ============================================
-- Step 5: Create fixed INSERT policy with proper NULL handling
-- ============================================
CREATE POLICY "Users can send messages in accessible channels or conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    -- Must be authenticated
    auth.role() = 'authenticated'
    AND auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND (
      -- Channel messages - must have channel_id and NOT conversation_id
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
              -- Public servers
              servers.is_public = true
              -- OR user owns the server
              OR servers.owner_id = auth.uid()
              -- OR user is a member
              OR EXISTS (
                SELECT 1 FROM public.server_members
                WHERE server_members.server_id = servers.id
                AND server_members.user_id = auth.uid()
              )
            )
          )
        )
      )
      -- OR conversation messages - must have conversation_id and NOT channel_id
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
-- Step 6: Create UPDATE policy
-- ============================================
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

-- ============================================
-- Step 7: Create DELETE policy
-- ============================================
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
-- Step 8: Fix triggers
-- ============================================
DROP TRIGGER IF EXISTS on_message_updated ON public.messages;
CREATE TRIGGER on_message_updated
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- Step 9: Create/update indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON public.messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at ON public.messages(conversation_id, created_at DESC);

-- ============================================
-- Step 10: Enable Realtime (if not already enabled)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- ============================================
-- Verification Queries
-- ============================================

SELECT '=== VERIFICATION ===' as section;

-- Check table structure
SELECT 'Table structure:' as info;
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'messages'
ORDER BY ordinal_position;

-- Check RLS is enabled
SELECT 'RLS enabled: ' || COALESCE(
  (SELECT relrowsecurity::text 
   FROM pg_class c
   JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE c.relname = 'messages' 
   AND n.nspname = 'public'
   LIMIT 1),
  'table not found'
) as info;

-- Check policies count
SELECT 'Policies count: ' || count(*)::text as info
FROM pg_policies WHERE tablename = 'messages';

-- Check constraint exists
SELECT 'Constraint exists: ' || CASE 
  WHEN EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
    AND table_name = 'messages'
    AND constraint_name = 'messages_channel_or_conversation_check'
  ) THEN 'YES'
  ELSE 'NO'
END as info;

-- Check function exists
SELECT 'handle_updated_at function exists: ' || CASE 
  WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'handle_updated_at'
    AND n.nspname = 'public'
  ) THEN 'YES'
  ELSE 'NO'
END as info;

-- Check trigger exists
SELECT 'Trigger exists: ' || CASE 
  WHEN EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'on_message_updated'
    AND c.relname = 'messages'
    AND n.nspname = 'public'
  ) THEN 'YES'
  ELSE 'NO'
END as info;

-- Check realtime is enabled
SELECT 'Realtime enabled: ' || CASE 
  WHEN EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'messages'
  ) THEN 'YES'
  ELSE 'NO'
END as info;


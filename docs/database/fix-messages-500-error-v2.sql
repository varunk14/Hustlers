-- ============================================
-- Fix 500 Internal Server Error on Messages Table (Version 2)
-- This version ensures server_members RLS allows the EXISTS checks
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
-- Step 2: Fix server_members RLS policy FIRST
-- This is critical - messages policy depends on this
-- ============================================

-- Ensure server_members table exists
CREATE TABLE IF NOT EXISTS public.server_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(server_id, user_id)
);

ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;

-- Drop existing server_members policies
DROP POLICY IF EXISTS "Users can view members of their servers" ON public.server_members;
DROP POLICY IF EXISTS "Users can view members of accessible servers" ON public.server_members;

-- Create a policy that allows users to see their own memberships
-- This is critical for EXISTS checks in messages policy to work
CREATE POLICY "Users can view members of their servers"
  ON public.server_members FOR SELECT
  USING (
    -- User can see their own memberships
    auth.uid() IS NOT NULL 
    AND user_id = auth.uid()
  );

-- ============================================
-- Step 3: Fix messages table structure
-- ============================================

-- Make channel_id nullable (if not already)
DO $$
BEGIN
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

-- Add conversation_id column if it doesn't exist (without FK if table doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'messages' 
    AND column_name = 'conversation_id'
  ) THEN
    -- Try to add with FK, but catch error if direct_messages doesn't exist
    BEGIN
      ALTER TABLE public.messages 
      ADD COLUMN conversation_id UUID REFERENCES public.direct_messages(id) ON DELETE CASCADE;
    EXCEPTION WHEN undefined_table THEN
      -- If direct_messages doesn't exist, add without FK
      ALTER TABLE public.messages 
      ADD COLUMN conversation_id UUID;
    END;
  END IF;
END $$;

-- Drop and recreate constraint
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_channel_or_conversation_check;

ALTER TABLE public.messages
ADD CONSTRAINT messages_channel_or_conversation_check 
CHECK (
  (channel_id IS NOT NULL AND conversation_id IS NULL) OR
  (channel_id IS NULL AND conversation_id IS NOT NULL)
);

-- ============================================
-- Step 4: Drop ALL existing message policies
-- ============================================
DROP POLICY IF EXISTS "Users can view messages in accessible channels or conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in accessible channels or conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in accessible channels" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in accessible channels" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

-- ============================================
-- Step 5: Create simplified SELECT policy
-- Using a function to avoid RLS evaluation issues
-- ============================================

-- Create a helper function to check channel access
CREATE OR REPLACE FUNCTION public.can_access_channel(p_channel_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.channels c
    JOIN public.servers s ON s.id = c.server_id
    WHERE c.id = p_channel_id
    AND (
      s.is_public = true
      OR (auth.uid() IS NOT NULL AND s.owner_id = auth.uid())
      OR (
        auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.server_members sm
          WHERE sm.server_id = s.id
          AND sm.user_id = auth.uid()
        )
      )
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create SELECT policy using the helper function
CREATE POLICY "Users can view messages in accessible channels or conversations"
  ON public.messages FOR SELECT
  USING (
    -- Channel messages
    (
      channel_id IS NOT NULL 
      AND public.can_access_channel(channel_id)
    )
    -- OR conversation messages
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
-- Step 6: Create INSERT policy using helper function
-- ============================================
CREATE POLICY "Users can send messages in accessible channels or conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND (
      -- Channel messages
      (
        channel_id IS NOT NULL
        AND conversation_id IS NULL
        AND EXISTS (
          SELECT 1 FROM public.channels
          WHERE channels.id = messages.channel_id
          AND channels.type = 'text'
        )
        AND public.can_access_channel(channel_id)
      )
      -- OR conversation messages
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
-- Step 7: Create UPDATE policy
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
-- Step 8: Create DELETE policy
-- ============================================
CREATE POLICY "Users can delete their own messages"
  ON public.messages FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND (
      auth.uid() = user_id
      OR (
        channel_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.channels c
          JOIN public.servers s ON s.id = c.server_id
          WHERE c.id = messages.channel_id
          AND (
            s.owner_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.server_members sm
              WHERE sm.server_id = s.id
              AND sm.user_id = auth.uid()
              AND sm.role IN ('owner', 'admin')
            )
          )
        )
      )
    )
  );

-- ============================================
-- Step 9: Fix triggers
-- ============================================
DROP TRIGGER IF EXISTS on_message_updated ON public.messages;
CREATE TRIGGER on_message_updated
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- Step 10: Create/update indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON public.messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at ON public.messages(conversation_id, created_at DESC);

-- ============================================
-- Step 11: Enable Realtime
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
-- Verification
-- ============================================

SELECT '=== VERIFICATION ===' as section;

-- Check function exists
SELECT 'can_access_channel function: ' || CASE 
  WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'can_access_channel'
    AND n.nspname = 'public'
  ) THEN 'EXISTS'
  ELSE 'MISSING'
END as info;

-- Check policies
SELECT 'messages policies: ' || count(*)::text as info
FROM pg_policies WHERE tablename = 'messages';

SELECT 'server_members policies: ' || count(*)::text as info
FROM pg_policies WHERE tablename = 'server_members';


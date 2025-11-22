-- ============================================
-- Minimal Fix for 500 Error on Messages Table
-- This uses the simplest possible RLS policies
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- Step 1: Ensure function exists
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Step 2: Drop ALL existing policies
-- ============================================
DROP POLICY IF EXISTS "Users can view messages in accessible channels or conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in accessible channels or conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in accessible channels" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in accessible channels" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

-- Drop the helper function if it exists (might be causing issues)
DROP FUNCTION IF EXISTS public.can_access_channel(UUID);

-- ============================================
-- Step 3: Create MINIMAL SELECT policy
-- This is the simplest possible policy that should work
-- ============================================
CREATE POLICY "Users can view messages in accessible channels or conversations"
  ON public.messages FOR SELECT
  USING (
    -- For channel messages, check access
    (
      channel_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 
        FROM public.channels c
        INNER JOIN public.servers s ON s.id = c.server_id
        WHERE c.id = messages.channel_id
        AND (
          s.is_public = true
          OR s.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 
            FROM public.server_members sm
            WHERE sm.server_id = s.id
            AND sm.user_id = auth.uid()
          )
        )
      )
    )
    -- For conversation messages (if conversation_id exists)
    OR (
      conversation_id IS NOT NULL
      AND auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 
        FROM public.direct_message_participants dmp
        WHERE dmp.conversation_id = messages.conversation_id
        AND dmp.user_id = auth.uid()
      )
    )
  );

-- ============================================
-- Step 4: Create MINIMAL INSERT policy
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
          SELECT 1 
          FROM public.channels c
          INNER JOIN public.servers s ON s.id = c.server_id
          WHERE c.id = messages.channel_id
          AND c.type = 'text'
          AND (
            s.is_public = true
            OR s.owner_id = auth.uid()
            OR EXISTS (
              SELECT 1 
              FROM public.server_members sm
              WHERE sm.server_id = s.id
              AND sm.user_id = auth.uid()
            )
          )
        )
      )
      -- Conversation messages
      OR (
        conversation_id IS NOT NULL
        AND channel_id IS NULL
        AND EXISTS (
          SELECT 1 
          FROM public.direct_message_participants dmp
          WHERE dmp.conversation_id = messages.conversation_id
          AND dmp.user_id = auth.uid()
        )
      )
    )
  );

-- ============================================
-- Step 5: Create UPDATE policy
-- ============================================
CREATE POLICY "Users can update their own messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Step 6: Create DELETE policy
-- ============================================
CREATE POLICY "Users can delete their own messages"
  ON public.messages FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Step 7: Ensure trigger exists
-- ============================================
DROP TRIGGER IF EXISTS on_message_updated ON public.messages;
CREATE TRIGGER on_message_updated
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- Verification
-- ============================================
SELECT 'Policies created: ' || count(*)::text 
FROM pg_policies 
WHERE tablename = 'messages';


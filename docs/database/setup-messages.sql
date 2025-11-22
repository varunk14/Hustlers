-- ============================================
-- Messages Table Setup Script
-- Run this in Supabase SQL Editor
-- Part of MVP #7: Real-Time Messaging
-- ============================================

-- Step 1: Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Step 2: Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Step 3: Enable Realtime for messages table
-- Only add if not already in publication
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

-- Step 4: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view messages in accessible channels" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in accessible channels" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

-- Step 5: Create RLS policies

-- SELECT policy: Users can view messages in channels they can access
CREATE POLICY "Users can view messages in accessible channels"
  ON public.messages FOR SELECT
  USING (
    -- User can see messages if they can see the channel
    EXISTS (
      SELECT 1 FROM public.channels
      WHERE channels.id = messages.channel_id
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
  );

-- INSERT policy: Users can send messages in channels they can access
CREATE POLICY "Users can send messages in accessible channels"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.channels
      WHERE channels.id = messages.channel_id
      AND channels.type = 'text'  -- Only text channels for now
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
      -- OR server owner/admin can delete any message
      OR EXISTS (
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
  );

-- Step 6: Create trigger for updated_at
DROP TRIGGER IF EXISTS on_message_updated ON public.messages;
CREATE TRIGGER on_message_updated
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Step 7: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON public.messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(channel_id, created_at DESC);

-- ============================================
-- Verification Queries (Optional - comment out if causing issues)
-- ============================================

-- Check if table exists
-- SELECT 'messages table exists: ' || EXISTS (
--   SELECT 1 FROM information_schema.tables 
--   WHERE table_schema = 'public' AND table_name = 'messages'
-- )::text;

-- Check RLS is enabled
-- SELECT 'messages RLS enabled: ' || COALESCE(
--   (SELECT relrowsecurity::text FROM pg_class 
--    WHERE relname = 'messages' 
--    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
--    LIMIT 1),
--   'table not found'
-- );

-- Check policies count
-- SELECT 'messages policies: ' || COALESCE(count(*)::text, '0')
-- FROM pg_policies WHERE tablename = 'messages';

-- Check if realtime is enabled
-- SELECT 'realtime enabled: ' || CASE 
--   WHEN EXISTS (
--     SELECT 1 FROM pg_publication_tables 
--     WHERE pubname = 'supabase_realtime' 
--     AND tablename = 'messages'
--   ) THEN 'true'
--   ELSE 'false'
-- END;


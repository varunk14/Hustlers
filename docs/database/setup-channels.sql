-- ============================================
-- Channels Table Setup Script
-- Run this in Supabase SQL Editor
-- Part of MVP #6: Text Channel Management
-- ============================================

-- Step 1: Create channels table
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'text' CHECK (type IN ('text', 'voice', 'video')) NOT NULL,
  position INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Step 2: Enable Row Level Security
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view channels of accessible servers" ON public.channels;
DROP POLICY IF EXISTS "Server owners and admins can create channels" ON public.channels;
DROP POLICY IF EXISTS "Server owners and admins can update channels" ON public.channels;
DROP POLICY IF EXISTS "Server owners and admins can delete channels" ON public.channels;

-- Step 4: Create RLS policies

-- SELECT policy: Users can view channels of servers they can access
CREATE POLICY "Users can view channels of accessible servers"
  ON public.channels FOR SELECT
  USING (
    -- User can see channels if they can see the server
    EXISTS (
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
  );

-- INSERT policy: Only server owners and admins can create channels
CREATE POLICY "Server owners and admins can create channels"
  ON public.channels FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() IS NOT NULL
    AND (
      -- Server owner
      EXISTS (
        SELECT 1 FROM public.servers
        WHERE servers.id = channels.server_id
        AND servers.owner_id = auth.uid()
      )
      -- OR server admin
      OR EXISTS (
        SELECT 1 FROM public.server_members
        WHERE server_members.server_id = channels.server_id
        AND server_members.user_id = auth.uid()
        AND server_members.role IN ('owner', 'admin')
      )
    )
  );

-- UPDATE policy: Only server owners and admins can update channels
CREATE POLICY "Server owners and admins can update channels"
  ON public.channels FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.servers
        WHERE servers.id = channels.server_id
        AND servers.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.server_members
        WHERE server_members.server_id = channels.server_id
        AND server_members.user_id = auth.uid()
        AND server_members.role IN ('owner', 'admin')
      )
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.servers
        WHERE servers.id = channels.server_id
        AND servers.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.server_members
        WHERE server_members.server_id = channels.server_id
        AND server_members.user_id = auth.uid()
        AND server_members.role IN ('owner', 'admin')
      )
    )
  );

-- DELETE policy: Only server owners and admins can delete channels
CREATE POLICY "Server owners and admins can delete channels"
  ON public.channels FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1 FROM public.servers
        WHERE servers.id = channels.server_id
        AND servers.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.server_members
        WHERE server_members.server_id = channels.server_id
        AND server_members.user_id = auth.uid()
        AND server_members.role IN ('owner', 'admin')
      )
    )
  );

-- Step 5: Create trigger for updated_at
DROP TRIGGER IF EXISTS on_channel_updated ON public.channels;
CREATE TRIGGER on_channel_updated
  BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_channels_server_id ON public.channels(server_id);
CREATE INDEX IF NOT EXISTS idx_channels_type ON public.channels(type);
CREATE INDEX IF NOT EXISTS idx_channels_position ON public.channels(server_id, position);

-- ============================================
-- Verification Queries
-- ============================================

-- Check if table exists
SELECT 'channels table exists: ' || EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'channels'
)::text;

-- Check RLS is enabled
SELECT 'channels RLS enabled: ' || (SELECT relrowsecurity FROM pg_class WHERE relname = 'channels')::text;

-- Check policies count
SELECT 'channels policies: ' || count(*)::text 
FROM pg_policies WHERE tablename = 'channels';


-- Complete Fix for Server 500 Errors
-- Run this entire script in Supabase SQL Editor

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
-- Step 2: Verify and fix servers table structure
-- ============================================

-- Check if servers table exists, create if not
CREATE TABLE IF NOT EXISTS public.servers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure updated_at column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'servers' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.servers 
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE 
    DEFAULT TIMEZONE('utc'::text, NOW());
  END IF;
END $$;

-- ============================================
-- Step 3: Fix triggers
-- ============================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_server_updated ON public.servers;

-- Create the trigger
CREATE TRIGGER on_server_updated
  BEFORE UPDATE ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- Step 4: Ensure RLS is enabled
-- ============================================
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 5: Fix RLS Policies for servers
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view accessible servers" ON public.servers;
DROP POLICY IF EXISTS "Users can view public servers" ON public.servers;
DROP POLICY IF EXISTS "Authenticated users can create servers" ON public.servers;
DROP POLICY IF EXISTS "Owners can update their servers" ON public.servers;
DROP POLICY IF EXISTS "Owners can delete their servers" ON public.servers;

-- Create SELECT policy (simplified first, then update after server_members exists)
CREATE POLICY "Users can view accessible servers"
  ON public.servers FOR SELECT
  USING (
    is_public = true 
    OR owner_id = auth.uid()
  );

-- Create INSERT policy
CREATE POLICY "Authenticated users can create servers"
  ON public.servers FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' 
    AND auth.uid() = owner_id
  );

-- Create UPDATE policy
CREATE POLICY "Owners can update their servers"
  ON public.servers FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Create DELETE policy
CREATE POLICY "Owners can delete their servers"
  ON public.servers FOR DELETE
  USING (owner_id = auth.uid());

-- ============================================
-- Step 6: Ensure server_members table exists
-- ============================================
CREATE TABLE IF NOT EXISTS public.server_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(server_id, user_id)
);

-- ============================================
-- Step 7: Enable RLS on server_members
-- ============================================
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 8: Fix RLS Policies for server_members
-- ============================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view members of their servers" ON public.server_members;
DROP POLICY IF EXISTS "Users can join public servers" ON public.server_members;
DROP POLICY IF EXISTS "Users can leave servers" ON public.server_members;

-- Create SELECT policy
CREATE POLICY "Users can view members of their servers"
  ON public.server_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.server_members sm
      WHERE sm.server_id = server_members.server_id
      AND sm.user_id = auth.uid()
    )
  );

-- Create INSERT policy (allows owner + public join)
CREATE POLICY "Users can join public servers"
  ON public.server_members FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = user_id
    AND (
      -- Allow joining public servers
      EXISTS (
        SELECT 1 FROM public.servers
        WHERE servers.id = server_members.server_id
        AND servers.is_public = true
      )
      -- OR allow owner to create their own membership
      OR EXISTS (
        SELECT 1 FROM public.servers
        WHERE servers.id = server_members.server_id
        AND servers.owner_id = auth.uid()
      )
    )
  );

-- Create DELETE policy
CREATE POLICY "Users can leave servers"
  ON public.server_members FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- Step 9: Update servers SELECT policy to include server_members check
-- ============================================
DROP POLICY IF EXISTS "Users can view accessible servers" ON public.servers;

CREATE POLICY "Users can view accessible servers"
  ON public.servers FOR SELECT
  USING (
    is_public = true 
    OR owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.server_members 
      WHERE server_members.server_id = servers.id 
      AND server_members.user_id = auth.uid()
    )
  );

-- ============================================
-- Step 10: Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_servers_owner_id ON public.servers(owner_id);
CREATE INDEX IF NOT EXISTS idx_servers_is_public ON public.servers(is_public);
CREATE INDEX IF NOT EXISTS idx_servers_created_at ON public.servers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_server_members_server_id ON public.server_members(server_id);
CREATE INDEX IF NOT EXISTS idx_server_members_user_id ON public.server_members(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_server_members_unique ON public.server_members(server_id, user_id);

-- ============================================
-- Verification Queries (run these to check)
-- ============================================

-- Check if function exists
SELECT 'Function exists: ' || EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at'
)::text;

-- Check if trigger exists
SELECT 'Trigger exists: ' || EXISTS (
  SELECT 1 FROM pg_trigger WHERE tgname = 'on_server_updated'
)::text;

-- Check if tables exist
SELECT 'servers table exists: ' || EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'servers'
)::text;

SELECT 'server_members table exists: ' || EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'server_members'
)::text;

-- Check RLS policies
SELECT 'servers policies: ' || count(*)::text 
FROM pg_policies WHERE tablename = 'servers';

SELECT 'server_members policies: ' || count(*)::text 
FROM pg_policies WHERE tablename = 'server_members';


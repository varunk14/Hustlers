-- ============================================
-- Server Tables Setup Script
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Create servers table
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

-- Step 2: Enable Row Level Security on servers
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

-- Step 3: Create basic policies for servers (without server_members reference)
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view accessible servers" ON public.servers;
DROP POLICY IF EXISTS "Authenticated users can create servers" ON public.servers;
DROP POLICY IF EXISTS "Owners can update their servers" ON public.servers;
DROP POLICY IF EXISTS "Owners can delete their servers" ON public.servers;

-- Create basic SELECT policy (will be updated after server_members is created)
CREATE POLICY "Users can view public servers"
  ON public.servers FOR SELECT
  USING (is_public = true OR owner_id = auth.uid());

-- Create INSERT policy
CREATE POLICY "Authenticated users can create servers"
  ON public.servers FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = owner_id);

-- Create UPDATE policy
CREATE POLICY "Owners can update their servers"
  ON public.servers FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Create DELETE policy
CREATE POLICY "Owners can delete their servers"
  ON public.servers FOR DELETE
  USING (owner_id = auth.uid());

-- Step 4: Create indexes for servers
CREATE INDEX IF NOT EXISTS idx_servers_owner_id ON public.servers(owner_id);
CREATE INDEX IF NOT EXISTS idx_servers_is_public ON public.servers(is_public);
CREATE INDEX IF NOT EXISTS idx_servers_created_at ON public.servers(created_at DESC);

-- Step 5: Create server_members table
CREATE TABLE IF NOT EXISTS public.server_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(server_id, user_id)
);

-- Step 6: Enable Row Level Security on server_members
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;

-- Step 7: Create policies for server_members
-- Drop existing policies if they exist
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

-- Create INSERT policy (allows joining public servers OR owner creating their membership)
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
      -- OR allow owner to create their own membership when creating server
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

-- Step 8: Create indexes for server_members
CREATE INDEX IF NOT EXISTS idx_server_members_server_id ON public.server_members(server_id);
CREATE INDEX IF NOT EXISTS idx_server_members_user_id ON public.server_members(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_server_members_unique ON public.server_members(server_id, user_id);

-- Step 9: Update servers SELECT policy to include server_members check
DROP POLICY IF EXISTS "Users can view public servers" ON public.servers;

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

-- Step 10: Create trigger for servers updated_at (if handle_updated_at function exists)
-- This function should already exist from the profiles table setup
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    DROP TRIGGER IF EXISTS on_server_updated ON public.servers;
    CREATE TRIGGER on_server_updated
      BEFORE UPDATE ON public.servers
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;


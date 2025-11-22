-- Comprehensive Fix for 500 Internal Server Error
-- This fixes RLS policy issues that cause 500 errors on GET and POST requests
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
-- Step 2: Ensure tables exist with correct structure
-- ============================================

-- Create servers table if it doesn't exist
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

-- Create server_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.server_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(server_id, user_id)
);

-- ============================================
-- Step 3: Enable RLS
-- ============================================
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Step 4: Drop all existing policies to start fresh
-- ============================================
DROP POLICY IF EXISTS "Users can view accessible servers" ON public.servers;
DROP POLICY IF EXISTS "Users can view public servers" ON public.servers;
DROP POLICY IF EXISTS "Authenticated users can create servers" ON public.servers;
DROP POLICY IF EXISTS "Owners can update their servers" ON public.servers;
DROP POLICY IF EXISTS "Owners can delete their servers" ON public.servers;

DROP POLICY IF EXISTS "Users can view members of their servers" ON public.server_members;
DROP POLICY IF EXISTS "Users can join public servers" ON public.server_members;
DROP POLICY IF EXISTS "Users can leave servers" ON public.server_members;

-- ============================================
-- Step 5: Create fixed RLS policies for servers
-- ============================================

-- SELECT policy: Allow viewing public servers OR servers user owns OR servers user is member of
-- This handles NULL auth.uid() properly for unauthenticated users
-- Note: We use COALESCE to handle NULL auth.uid() safely in the EXISTS clause
CREATE POLICY "Users can view accessible servers"
  ON public.servers FOR SELECT
  USING (
    -- Public servers are visible to everyone (including unauthenticated)
    is_public = true 
    -- OR user owns the server (only if authenticated)
    OR (auth.uid() IS NOT NULL AND owner_id = auth.uid())
    -- OR user is a member (only if authenticated)
    -- We check auth.uid() first to avoid NULL comparison issues
    OR (
      auth.uid() IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM public.server_members 
        WHERE server_members.server_id = servers.id 
        AND server_members.user_id = auth.uid()
        -- Ensure we can read from server_members (RLS will handle this)
      )
    )
  );

-- INSERT policy: Only authenticated users can create servers, and must be the owner
CREATE POLICY "Authenticated users can create servers"
  ON public.servers FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' 
    AND auth.uid() IS NOT NULL
    AND auth.uid() = owner_id
  );

-- UPDATE policy: Only owners can update
CREATE POLICY "Owners can update their servers"
  ON public.servers FOR UPDATE
  USING (
    auth.uid() IS NOT NULL 
    AND owner_id = auth.uid()
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND owner_id = auth.uid()
  );

-- DELETE policy: Only owners can delete
CREATE POLICY "Owners can delete their servers"
  ON public.servers FOR DELETE
  USING (
    auth.uid() IS NOT NULL 
    AND owner_id = auth.uid()
  );

-- ============================================
-- Step 6: Create fixed RLS policies for server_members
-- ============================================

-- SELECT policy: Users can view members of servers they belong to
-- This policy must allow the EXISTS check in servers policy to work
-- The key is: allow reading server_members rows where user_id = auth.uid()
-- This enables the EXISTS check: EXISTS (SELECT 1 FROM server_members WHERE user_id = auth.uid())
-- 
-- IMPORTANT: We keep this simple to avoid circular dependencies and RLS evaluation issues.
-- The EXISTS check in servers policy will work because this policy allows reading rows 
-- where user_id = auth.uid(). For now, we only allow users to see their own memberships
-- to ensure reliability. The ability to see other members can be added later if needed.
CREATE POLICY "Users can view members of their servers"
  ON public.server_members FOR SELECT
  USING (
    -- User can see their own memberships
    -- This is critical for the EXISTS check in servers policy to work
    auth.uid() IS NOT NULL 
    AND user_id = auth.uid()
  );

-- INSERT policy: Allow joining public servers OR owner creating their own membership
CREATE POLICY "Users can join public servers"
  ON public.server_members FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() IS NOT NULL
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

-- DELETE policy: Users can leave servers they're members of
CREATE POLICY "Users can leave servers"
  ON public.server_members FOR DELETE
  USING (
    auth.uid() IS NOT NULL 
    AND user_id = auth.uid()
  );

-- ============================================
-- Step 7: Ensure triggers exist
-- ============================================
DROP TRIGGER IF EXISTS on_server_updated ON public.servers;
CREATE TRIGGER on_server_updated
  BEFORE UPDATE ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- Step 8: Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_servers_owner_id ON public.servers(owner_id);
CREATE INDEX IF NOT EXISTS idx_servers_is_public ON public.servers(is_public);
CREATE INDEX IF NOT EXISTS idx_servers_created_at ON public.servers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_server_members_server_id ON public.server_members(server_id);
CREATE INDEX IF NOT EXISTS idx_server_members_user_id ON public.server_members(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_server_members_unique ON public.server_members(server_id, user_id);

-- ============================================
-- Verification Queries
-- ============================================

-- Check if tables exist
SELECT 'servers table exists: ' || EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'servers'
)::text;

SELECT 'server_members table exists: ' || EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'server_members'
)::text;

-- Check RLS is enabled
SELECT 'servers RLS enabled: ' || (SELECT relrowsecurity FROM pg_class WHERE relname = 'servers')::text;
SELECT 'server_members RLS enabled: ' || (SELECT relrowsecurity FROM pg_class WHERE relname = 'server_members')::text;

-- Check policies count
SELECT 'servers policies: ' || count(*)::text 
FROM pg_policies WHERE tablename = 'servers';

SELECT 'server_members policies: ' || count(*)::text 
FROM pg_policies WHERE tablename = 'server_members';

-- Test query (should work without errors)
-- This should return public servers even for unauthenticated users
SELECT count(*) as public_servers_count 
FROM public.servers 
WHERE is_public = true;


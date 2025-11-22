-- ============================================
-- Test Messages RLS Policies
-- Run this to see what's actually failing
-- ============================================

-- Test 1: Check if we can read from messages table
-- This should work if SELECT policy is correct
SELECT 'Test 1: SELECT from messages' as test;
SELECT count(*) as message_count FROM public.messages LIMIT 1;

-- Test 2: Check if we can see the channel
SELECT 'Test 2: Check channel access' as test;
SELECT 
  c.id,
  c.name,
  c.type,
  s.id as server_id,
  s.name as server_name,
  s.is_public,
  s.owner_id = auth.uid() as is_owner,
  EXISTS (
    SELECT 1 FROM public.server_members sm
    WHERE sm.server_id = s.id
    AND sm.user_id = auth.uid()
  ) as is_member
FROM public.channels c
JOIN public.servers s ON s.id = c.server_id
WHERE c.id = 'c621c400-b449-4aba-9893-33ee40fc32f2'::uuid
LIMIT 1;

-- Test 3: Check server_members access
SELECT 'Test 3: Check server_members access' as test;
SELECT count(*) as membership_count
FROM public.server_members
WHERE user_id = auth.uid();

-- Test 4: Test the SELECT policy logic manually
SELECT 'Test 4: Test SELECT policy logic' as test;
SELECT 
  m.id,
  m.channel_id,
  EXISTS (
    SELECT 1 FROM public.channels
    WHERE channels.id = m.channel_id
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
  ) as can_access
FROM public.messages m
WHERE m.channel_id = 'c621c400-b449-4aba-9893-33ee40fc32f2'::uuid
LIMIT 5;

-- Test 5: Check current user
SELECT 'Test 5: Current user' as test;
SELECT auth.uid() as current_user_id, auth.role() as current_role;


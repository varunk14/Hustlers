-- ============================================
-- Diagnostic Script for Message Sending Issues
-- Run this in Supabase SQL Editor to diagnose problems
-- ============================================

-- ============================================
-- PART 1: Check Table Structure
-- ============================================

SELECT '=== TABLE STRUCTURE ===' as section;

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'messages'
ORDER BY ordinal_position;

-- ============================================
-- PART 2: Check RLS Status
-- ============================================

SELECT '=== RLS STATUS ===' as section;

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'messages';

-- ============================================
-- PART 3: List All Policies
-- ============================================

SELECT '=== RLS POLICIES ===' as section;

SELECT 
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'messages'
ORDER BY policyname;

-- ============================================
-- PART 4: Check Constraints
-- ============================================

SELECT '=== CONSTRAINTS ===' as section;

SELECT 
  constraint_name,
  constraint_type,
  check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
AND tc.table_name = 'messages';

-- ============================================
-- PART 5: Test RLS Policy Logic (Manual Check)
-- ============================================

SELECT '=== RLS POLICY TEST ===' as section;
SELECT 'Run this query as the authenticated user to test INSERT policy:' as note;

-- This query simulates what the INSERT policy checks
-- Replace 'YOUR_USER_ID' and 'YOUR_CHANNEL_ID' with actual values
/*
SELECT 
  'User can insert message' as test,
  EXISTS (
    SELECT 1 FROM public.channels
    WHERE channels.id = 'YOUR_CHANNEL_ID'::uuid
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
  ) as can_insert;
*/

-- ============================================
-- PART 6: Check Sample Data
-- ============================================

SELECT '=== SAMPLE DATA ===' as section;

-- Check if there are any channels
SELECT 'Channels count:' as info, count(*)::text as value FROM public.channels;

-- Check if there are any servers
SELECT 'Servers count:' as info, count(*)::text as value FROM public.servers;

-- Check if there are any server members
SELECT 'Server members count:' as info, count(*)::text as value FROM public.server_members;

-- Check if there are any messages
SELECT 'Messages count:' as info, count(*)::text as value FROM public.messages;

-- ============================================
-- PART 7: Check Current User's Access
-- ============================================

SELECT '=== CURRENT USER ACCESS ===' as section;
SELECT 'Current user ID:' as info, auth.uid()::text as value;

-- Check which servers the current user is a member of
SELECT 
  'User server memberships:' as info,
  json_agg(json_build_object(
    'server_id', sm.server_id,
    'role', sm.role,
    'server_name', s.name
  ))::text as value
FROM public.server_members sm
JOIN public.servers s ON s.id = sm.server_id
WHERE sm.user_id = auth.uid();

-- Check which channels the current user can access
SELECT 
  'Accessible channels:' as info,
  json_agg(json_build_object(
    'channel_id', c.id,
    'channel_name', c.name,
    'server_id', c.server_id,
    'server_name', s.name,
    'is_public', s.is_public,
    'is_owner', s.owner_id = auth.uid(),
    'is_member', EXISTS (
      SELECT 1 FROM public.server_members sm2
      WHERE sm2.server_id = s.id AND sm2.user_id = auth.uid()
    )
  ))::text as value
FROM public.channels c
JOIN public.servers s ON s.id = c.server_id
WHERE c.type = 'text'
AND (
  s.is_public = true
  OR s.owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.server_members sm
    WHERE sm.server_id = s.id
    AND sm.user_id = auth.uid()
  )
);

-- ============================================
-- PART 8: Verify Realtime is Enabled
-- ============================================

SELECT '=== REALTIME STATUS ===' as section;

SELECT 
  'Realtime enabled for messages:' as info,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'messages'
    ) THEN 'YES'
    ELSE 'NO'
  END as value;


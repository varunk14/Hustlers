-- Fix for 500 Internal Server Error on Messages API
-- This fixes RLS policy issues after adding conversation_id support
-- Run this in Supabase SQL Editor

-- Step 1: Drop the problematic policy
DROP POLICY IF EXISTS "Users can view messages in accessible channels or conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in accessible channels or conversations" ON public.messages;

-- Step 2: Create fixed SELECT policy with proper NULL handling
CREATE POLICY "Users can view messages in accessible channels or conversations"
  ON public.messages FOR SELECT
  USING (
    -- Channel messages (existing logic) - only check if channel_id is not null
    (
      channel_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM public.channels
        WHERE channels.id = messages.channel_id
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
      )
    )
    -- OR conversation messages (new logic) - only check if conversation_id is not null
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

-- Step 3: Create fixed INSERT policy with proper NULL handling
CREATE POLICY "Users can send messages in accessible channels or conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND (
      -- Channel messages (existing logic)
      (
        channel_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.channels
          WHERE channels.id = messages.channel_id
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
        )
      )
      -- OR conversation messages (new logic)
      OR (
        conversation_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.direct_message_participants
          WHERE direct_message_participants.conversation_id = messages.conversation_id
          AND direct_message_participants.user_id = auth.uid()
        )
      )
    )
  );

-- Verification: Check policies exist
SELECT 'messages policies: ' || count(*)::text 
FROM pg_policies WHERE tablename = 'messages';


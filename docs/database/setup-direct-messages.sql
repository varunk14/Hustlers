-- ============================================
-- Direct Messages Setup Script
-- Run this in Supabase SQL Editor
-- Part of MVP #8: Direct Messaging (1:1 / Small Group)
-- ============================================

-- Step 1: Create direct_messages table (conversations)
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT, -- Optional name for group conversations
  type TEXT DEFAULT 'direct' CHECK (type IN ('direct', 'group')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Step 2: Create direct_message_participants table
CREATE TABLE IF NOT EXISTS public.direct_message_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.direct_messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(conversation_id, user_id)
);

-- Step 3: Modify messages table to support both channels and DMs
-- Add conversation_id column (nullable, for DMs)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.direct_messages(id) ON DELETE CASCADE;

-- Add constraint: either channel_id or conversation_id must be set, but not both
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_channel_or_conversation_check;

ALTER TABLE public.messages
ADD CONSTRAINT messages_channel_or_conversation_check 
CHECK (
  (channel_id IS NOT NULL AND conversation_id IS NULL) OR
  (channel_id IS NULL AND conversation_id IS NOT NULL)
);

-- Step 4: Enable Row Level Security
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_message_participants ENABLE ROW LEVEL SECURITY;

-- Step 5: Enable Realtime for direct_messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'direct_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'direct_message_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_message_participants;
  END IF;
END $$;

-- Step 6: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their conversations" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can create conversations" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.direct_messages;
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.direct_message_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON public.direct_message_participants;
DROP POLICY IF EXISTS "Users can leave conversations" ON public.direct_message_participants;

-- Step 7: Create RLS policies for direct_messages

-- SELECT policy: Users can view conversations they're part of
CREATE POLICY "Users can view their conversations"
  ON public.direct_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.direct_message_participants
      WHERE direct_message_participants.conversation_id = direct_messages.id
      AND direct_message_participants.user_id = auth.uid()
    )
  );

-- INSERT policy: Authenticated users can create conversations
CREATE POLICY "Users can create conversations"
  ON public.direct_messages FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() IS NOT NULL);

-- UPDATE policy: Users can update conversations they're part of (for group names)
CREATE POLICY "Users can update their conversations"
  ON public.direct_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.direct_message_participants
      WHERE direct_message_participants.conversation_id = direct_messages.id
      AND direct_message_participants.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.direct_message_participants
      WHERE direct_message_participants.conversation_id = direct_messages.id
      AND direct_message_participants.user_id = auth.uid()
    )
  );

-- Step 8: Create RLS policies for direct_message_participants

-- SELECT policy: Users can view participants of their conversations
CREATE POLICY "Users can view participants of their conversations"
  ON public.direct_message_participants FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.direct_message_participants dmp2
        WHERE dmp2.conversation_id = direct_message_participants.conversation_id
        AND dmp2.user_id = auth.uid()
      )
    )
  );

-- INSERT policy: Users can join conversations (with restrictions)
CREATE POLICY "Users can join conversations"
  ON public.direct_message_participants FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND (
      -- For direct messages (1:1), only allow if conversation has < 2 participants
      EXISTS (
        SELECT 1 FROM public.direct_messages
        WHERE direct_messages.id = direct_message_participants.conversation_id
        AND direct_messages.type = 'direct'
        AND (
          SELECT count(*) FROM public.direct_message_participants
          WHERE conversation_id = direct_message_participants.conversation_id
        ) < 2
      )
      -- For group messages, allow joining
      OR EXISTS (
        SELECT 1 FROM public.direct_messages
        WHERE direct_messages.id = direct_message_participants.conversation_id
        AND direct_messages.type = 'group'
      )
    )
  );

-- DELETE policy: Users can leave conversations
CREATE POLICY "Users can leave conversations"
  ON public.direct_message_participants FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND user_id = auth.uid()
  );

-- Step 9: Update messages RLS policies to support DMs

-- Drop existing message policies
DROP POLICY IF EXISTS "Users can view messages in accessible channels" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in accessible channels" ON public.messages;

-- Updated SELECT policy: Users can view messages in channels OR conversations they're part of
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

-- Updated INSERT policy: Users can send messages in channels OR conversations they're part of
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

-- Step 10: Create triggers
DROP TRIGGER IF EXISTS on_direct_message_updated ON public.direct_messages;
CREATE TRIGGER on_direct_message_updated
  BEFORE UPDATE ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Step 11: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_direct_messages_type ON public.direct_messages(type);
CREATE INDEX IF NOT EXISTS idx_direct_messages_updated_at ON public.direct_messages(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_message_participants_conversation_id ON public.direct_message_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_direct_message_participants_user_id ON public.direct_message_participants(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_direct_message_participants_unique ON public.direct_message_participants(conversation_id, user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at ON public.messages(conversation_id, created_at DESC);


-- ============================================
-- Fix Direct Messages RLS Policy
-- This fixes the issue where creating conversations fails
-- ============================================

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Users can join conversations" ON public.direct_message_participants;

-- Create a helper function to check participant count (excluding the row being inserted)
CREATE OR REPLACE FUNCTION public.check_direct_message_participant_count(
  p_conversation_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_type TEXT;
  v_existing_count INTEGER;
BEGIN
  -- Get conversation type
  SELECT type INTO v_type
  FROM public.direct_messages
  WHERE id = p_conversation_id;
  
  -- If group, always allow
  IF v_type = 'group' THEN
    RETURN TRUE;
  END IF;
  
  -- For direct messages, count existing participants (excluding the one being inserted)
  SELECT count(*) INTO v_existing_count
  FROM public.direct_message_participants
  WHERE conversation_id = p_conversation_id
  AND user_id != p_user_id;
  
  -- Allow if less than 2 existing participants (so we can have max 2 total)
  RETURN v_existing_count < 2;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the INSERT policy using the helper function
CREATE POLICY "Users can join conversations"
  ON public.direct_message_participants FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() IS NOT NULL
    AND auth.uid() = user_id
    AND public.check_direct_message_participant_count(
      direct_message_participants.conversation_id,
      direct_message_participants.user_id
    )
  );


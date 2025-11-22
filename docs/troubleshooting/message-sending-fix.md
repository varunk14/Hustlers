# Fix Message Sending Issues

## Problem
Messages are not sending in channels. Users see "Failed to send message" error.

## Root Cause
The issue is typically caused by:
1. **RLS Policy Mismatch**: The Row Level Security (RLS) policies on the `messages` table may not be correctly configured to allow message insertion
2. **Schema Issues**: The `messages` table schema may not support both `channel_id` and `conversation_id` properly
3. **Missing Constraints**: The table may be missing the constraint that ensures either `channel_id` or `conversation_id` is set (but not both)

## Solution

### Step 1: Run the Fix Script

1. Open your Supabase Dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `docs/database/fix-message-sending.sql`
4. Run the script

This script will:
- Update the `messages` table schema to support both channels and direct messages
- Fix all RLS policies to properly handle channel messages
- Add necessary indexes for performance
- Verify the changes

### Step 2: Verify the Fix

After running the script, verify:

1. **Check Policies**: The verification query at the end should show that policies exist
2. **Test Message Sending**: Try sending a message in a channel
3. **Check Browser Console**: If errors persist, check the browser console for detailed error messages

### Step 3: Common Issues

#### Issue: "Permission denied" error
- **Cause**: RLS policy is blocking the insert
- **Solution**: Make sure you're a member of the server/channel you're trying to message in

#### Issue: "Invalid channel" error
- **Cause**: The channel_id doesn't exist or you don't have access
- **Solution**: Refresh the page and try again

#### Issue: Still getting errors after running the script
- **Cause**: The script may have failed or policies weren't applied correctly
- **Solution**: 
  1. Check the SQL Editor for any errors
  2. Manually verify the policies exist:
     ```sql
     SELECT * FROM pg_policies WHERE tablename = 'messages';
     ```
  3. Check the table structure:
     ```sql
     SELECT column_name, is_nullable 
     FROM information_schema.columns 
     WHERE table_name = 'messages';
     ```

## Technical Details

### RLS Policy Requirements

The INSERT policy for messages must:
1. Check that the user is authenticated
2. Verify the user owns the message (user_id matches auth.uid())
3. For channel messages:
   - Verify `channel_id` is set and `conversation_id` is NULL
   - Verify the channel exists and is a text channel
   - Verify the user has access to the server (is public, is owner, or is a member)
4. For conversation messages:
   - Verify `conversation_id` is set and `channel_id` is NULL
   - Verify the user is a participant in the conversation

### Table Schema Requirements

The `messages` table must:
- Have `channel_id` as nullable (for direct messages)
- Have `conversation_id` column (nullable, for direct messages)
- Have a constraint ensuring exactly one of `channel_id` or `conversation_id` is set

## Related Files

- `docs/database/fix-message-sending.sql` - Main fix script
- `docs/database/fix-all-messaging-issues.sql` - Comprehensive messaging fixes
- `docs/database/fix-messages-rls.sql` - RLS policy fixes
- `src/hooks/useMessages.ts` - Message sending hook


# Debug Message Sending Issues

## Current Status
Getting **500 Internal Server Error** from Supabase on both GET and POST requests to `/rest/v1/messages`. This is a server-side database error, not a client-side issue.

## Enhanced Debugging Steps

### Step 1: Fix the 500 Error (CRITICAL)

**The 500 error indicates a database/server-side issue. Run this fix first:**

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `docs/database/fix-messages-500-error.sql`
3. Run the entire script
4. Check the verification output at the end

This script will:
- ✅ Ensure the `handle_updated_at()` function exists
- ✅ Fix the table structure (make `channel_id` nullable, add `conversation_id`)
- ✅ Fix all RLS policies with proper NULL handling
- ✅ Fix triggers
- ✅ Verify everything is set up correctly

**After running this script, try sending a message again.**

### Step 2: Check Browser Console
1. Open your browser's Developer Tools (F12 or Cmd+Option+I)
2. Go to the **Console** tab
3. Make sure console filters are set to show **All levels** (not just Errors)
4. Try sending a message
5. Look for logs starting with:
   - 🔵 `sendMessage called`
   - 📤 `Attempting to send message`
   - 🔐 `Current session`
   - 📥 `Insert response`
   - ❌ Any error messages

### Step 3: Check Network Tab
1. In Developer Tools, go to the **Network** tab
2. Try sending a message
3. Look for a request to `/rest/v1/messages`
4. Click on it to see:
   - **Request Payload**: What data is being sent
   - **Response**: What the server returned
   - **Status Code**: Should be 200 for success, 400/401/403 for errors

### Step 4: Run Diagnostic SQL Script
1. Open Supabase Dashboard → SQL Editor
2. Run `docs/database/diagnose-message-issues.sql`
3. Check the output for:
   - **RLS Policies**: Should show policies exist
   - **Current User Access**: Should show which channels you can access
   - **Table Structure**: Should show `channel_id` is nullable

### Step 5: Verify User Permissions
Run this query in Supabase SQL Editor (replace with your actual channel ID):

```sql
-- Check if you can access the channel
SELECT 
  c.id as channel_id,
  c.name as channel_name,
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
WHERE c.id = 'YOUR_CHANNEL_ID_HERE'::uuid;
```

### Step 6: Test RLS Policy Directly
Try inserting a message directly in SQL Editor (replace with your values):

```sql
-- This will show you the exact error if RLS blocks it
INSERT INTO public.messages (user_id, channel_id, content)
VALUES (
  auth.uid(),
  'YOUR_CHANNEL_ID_HERE'::uuid,
  'Test message'
)
RETURNING *;
```

## Common Issues and Solutions

### Issue: 500 Internal Server Error
**This is the current issue!**

**Possible causes:**
- Missing `handle_updated_at()` function
- RLS policy syntax error
- Table structure mismatch (channel_id still NOT NULL)
- Trigger error

**Solution:**
1. **Run the fix script**: `docs/database/fix-messages-500-error.sql`
2. Check Supabase Logs: Dashboard → Logs → Postgres Logs
3. Verify the function exists: Run `SELECT proname FROM pg_proc WHERE proname = 'handle_updated_at';`
4. Check table structure: Run the verification queries in the fix script

### Issue: No console logs appear
**Possible causes:**
- Console is filtered (check filter settings)
- JavaScript errors preventing code execution
- Code changes not deployed/refreshed

**Solution:**
1. Hard refresh the page (Cmd+Shift+R or Ctrl+Shift+R)
2. Check if the app is using the latest code
3. Clear browser cache

### Issue: "Permission denied" error
**Possible causes:**
- User is not a member of the server
- RLS policy is blocking the insert
- Channel doesn't exist

**Solution:**
1. Verify you're a member: Check `server_members` table
2. Verify channel exists: Check `channels` table
3. Re-run the fix script: `docs/database/fix-message-sending.sql`

### Issue: Network request shows 401/403
**Possible causes:**
- Session expired
- Supabase client not authenticated
- RLS policy too restrictive

**Solution:**
1. Log out and log back in
2. Check browser cookies for Supabase session
3. Verify RLS policies allow authenticated users

### Issue: Network request shows 400
**Possible causes:**
- Invalid data format
- Missing required fields
- Constraint violation

**Solution:**
1. Check the request payload in Network tab
2. Verify `channel_id` is a valid UUID
3. Check table constraints

## Next Steps

1. **Check Console Logs**: Look for the new detailed logs we added
2. **Check Network Tab**: See the actual HTTP request/response
3. **Run Diagnostic Script**: Verify database setup
4. **Test Direct SQL Insert**: See if RLS is the issue

## What the Enhanced Logging Shows

The updated code now logs:
- When `sendMessage` is called
- The message data being sent
- Current authentication session
- Full Supabase error response
- Success/failure status

All logs are prefixed with emojis for easy identification:
- 🔵 Function entry
- 📤 Outgoing request
- 🔐 Authentication check
- 📥 Incoming response
- ✅ Success
- ❌ Error


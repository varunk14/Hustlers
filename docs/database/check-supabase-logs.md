# How to Check Supabase Logs for 500 Errors

## The Problem
You're getting 500 Internal Server Errors, but we need to see the actual error message from Postgres to fix it.

## Steps to Check Logs

1. **Open Supabase Dashboard**
   - Go to your project dashboard

2. **Navigate to Logs**
   - Click on "Logs" in the left sidebar
   - Or go to: Project Settings → Logs

3. **View Postgres Logs**
   - Select "Postgres Logs" from the log type dropdown
   - Look for recent errors (they'll be in red)

4. **Find the Error**
   - Look for errors around the time you tried to send a message
   - The error will show the actual SQL error message
   - Common patterns to look for:
     - `ERROR: ...`
     - `permission denied`
     - `relation does not exist`
     - `function does not exist`
     - `syntax error`

5. **Copy the Error**
   - Copy the full error message
   - Share it so we can create a targeted fix

## Alternative: Test Directly in SQL Editor

You can also test the query directly to see the error:

```sql
-- Test SELECT (this is what GET /rest/v1/messages does)
SELECT * 
FROM public.messages 
WHERE channel_id = 'c621c400-b449-4aba-9893-33ee40fc32f2'::uuid
ORDER BY created_at ASC
LIMIT 100;

-- Test INSERT (this is what POST /rest/v1/messages does)
-- Replace with your actual user_id and channel_id
INSERT INTO public.messages (user_id, channel_id, content)
VALUES (
  auth.uid(),
  'c621c400-b449-4aba-9893-33ee40fc32f2'::uuid,
  'Test message'
)
RETURNING *;
```

These queries will show you the exact error message if there's a problem.

## Common Error Messages and Fixes

### "permission denied for table messages"
- **Cause**: RLS is blocking access
- **Fix**: Check that policies are created correctly

### "relation 'server_members' does not exist"
- **Cause**: Table doesn't exist
- **Fix**: Create the table first

### "function can_access_channel(uuid) does not exist"
- **Cause**: Function was dropped or never created
- **Fix**: Recreate the function or use a different approach

### "syntax error at or near..."
- **Cause**: SQL syntax error in policy
- **Fix**: Check the policy SQL syntax

## Next Steps

1. Check the logs and share the error message
2. Or run the test queries above and share the error
3. Once we have the actual error, we can create a targeted fix


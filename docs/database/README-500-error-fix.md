# Fix for 500 Internal Server Error on Servers API

## Problem

You're experiencing 500 Internal Server Errors when:
- GET `/rest/v1/servers?select=*&is_public=eq.true&order=created_at.desc&limit=50`
- POST `/rest/v1/servers?select=*`

## Root Cause

The 500 errors are typically caused by:
1. **RLS Policy Issues**: Row Level Security policies that don't handle NULL `auth.uid()` properly
2. **Missing Functions**: The `handle_updated_at()` trigger function might not exist
3. **Circular Dependencies**: RLS policies that reference each other in ways that cause evaluation failures
4. **Missing Tables**: The `server_members` table might not exist when policies reference it

## Solution

Run the comprehensive fix script:

```bash
# Open Supabase Dashboard → SQL Editor
# Copy and paste the contents of: docs/database/fix-500-error-comprehensive.sql
# Execute the script
```

## What the Fix Does

1. **Creates/Updates Functions**: Ensures `handle_updated_at()` function exists
2. **Creates Tables**: Ensures both `servers` and `server_members` tables exist with correct structure
3. **Fixes RLS Policies**: 
   - Handles NULL `auth.uid()` properly (for unauthenticated users)
   - Allows public servers to be visible to everyone
   - Allows EXISTS checks to work correctly
   - Prevents circular dependencies
4. **Creates Triggers**: Ensures the `updated_at` trigger works
5. **Creates Indexes**: Improves query performance

## Key Changes

### Servers SELECT Policy
- **Before**: Might fail when `auth.uid()` is NULL
- **After**: Explicitly checks `auth.uid() IS NOT NULL` before using it
- **Result**: Public servers are visible to everyone, including unauthenticated users

### Server Members SELECT Policy
- **Before**: Might have circular dependencies
- **After**: Allows reading memberships where `user_id = auth.uid()`, which enables EXISTS checks
- **Result**: The EXISTS check in servers policy can now work correctly

## Verification

After running the fix, the script includes verification queries that will show:
- ✅ Tables exist
- ✅ RLS is enabled
- ✅ Policies are created
- ✅ Test query works

## If Issues Persist

1. **Check Supabase Logs**: Go to Supabase Dashboard → Logs → Postgres Logs
2. **Check RLS Policies**: Go to Database → Tables → servers → Policies
3. **Test Manually**: Try running the verification queries at the end of the script
4. **Check Auth**: Ensure you're authenticated when testing POST requests

## Related Files

- `docs/database/fix-500-error-comprehensive.sql` - The main fix script
- `docs/database/complete-server-fix.sql` - Previous fix attempt (may have issues)
- `docs/database/schema.md` - Database schema documentation


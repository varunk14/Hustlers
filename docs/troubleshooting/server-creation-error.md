# Troubleshooting: "Failed to create server" Error

## Quick Debugging Steps

### Step 1: Check Browser Console

1. Open browser DevTools (F12 or Right-click → Inspect)
2. Go to the **Console** tab
3. Try creating a server again
4. Look for the actual error message

The error message will tell us exactly what's wrong. Common errors:

- `relation "public.servers" does not exist` → Tables not created
- `new row violates row-level security policy` → RLS policy issue
- `permission denied` → Missing permissions

### Step 2: Verify Database Tables Exist

1. Go to Supabase Dashboard
2. Navigate to **Table Editor**
3. Check if these tables exist:
   - ✅ `servers`
   - ✅ `server_members`

**If tables don't exist:**
- Run `docs/database/setup-servers.sql` in SQL Editor

### Step 3: Check RLS Policies

1. Go to Supabase Dashboard → **Authentication** → **Policies**
2. Or go to **Table Editor** → Select `servers` table → **Policies** tab
3. Verify these policies exist for `servers` table:

**Required Policies:**
- ✅ "Authenticated users can create servers" (INSERT policy)
- ✅ "Users can view accessible servers" (SELECT policy)
- ✅ "Owners can update their servers" (UPDATE policy)
- ✅ "Owners can delete their servers" (DELETE policy)

4. Verify these policies exist for `server_members` table:

**Required Policies:**
- ✅ "Users can join public servers" (INSERT policy)
- ✅ "Users can view members of their servers" (SELECT policy)
- ✅ "Users can leave servers" (DELETE policy)

### Step 4: Verify User is Authenticated

1. Check if you're logged in
2. Go to `/profile` - should show your profile
3. Check browser console for auth errors

### Step 5: Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to **Logs** → **Postgres Logs** or **API Logs**
3. Look for errors when creating a server
4. The logs will show the exact SQL error

---

## Common Issues & Solutions

### Issue 1: Tables Don't Exist

**Error:** `relation "public.servers" does not exist`

**Solution:**
```sql
-- Run this in Supabase SQL Editor
-- Copy entire contents of docs/database/setup-servers.sql
```

### Issue 2: RLS Policy Blocking Insert

**Error:** `new row violates row-level security policy`

**Solution:**
Check the INSERT policy for `servers` table:

```sql
-- Should be:
CREATE POLICY "Authenticated users can create servers"
  ON public.servers FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = owner_id);
```

If missing, create it:
```sql
CREATE POLICY "Authenticated users can create servers"
  ON public.servers FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = owner_id);
```

### Issue 3: Missing owner_id Check

**Error:** Policy violation on INSERT

**Solution:**
Make sure the policy checks `auth.uid() = owner_id`:
```sql
DROP POLICY IF EXISTS "Authenticated users can create servers" ON public.servers;

CREATE POLICY "Authenticated users can create servers"
  ON public.servers FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' 
    AND auth.uid() = owner_id
  );
```

### Issue 4: server_members Insert Failing

**Error:** Cannot insert into `server_members`

**Solution:**
Check the INSERT policy for `server_members`:

```sql
-- Should allow owner to insert their own membership
-- The policy might be too restrictive

-- First, check if policy exists
SELECT * FROM pg_policies 
WHERE tablename = 'server_members' 
AND policyname = 'Users can join public servers';

-- If it doesn't allow owner insertion, we need to update it
-- For now, owners can bypass by directly inserting
-- Or update policy to allow owner role
```

**Quick fix - Allow owner to insert membership:**
```sql
DROP POLICY IF EXISTS "Users can join public servers" ON public.server_members;

CREATE POLICY "Users can join public servers"
  ON public.server_members FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
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
```

### Issue 5: User Not Authenticated

**Error:** `auth.uid() is null` or similar

**Solution:**
1. Make sure you're logged in
2. Check browser console for auth errors
3. Try logging out and back in
4. Check Supabase Auth settings

---

## Quick Fix Script

If you're still having issues, run this complete setup:

```sql
-- 1. Drop existing policies (if any)
DROP POLICY IF EXISTS "Authenticated users can create servers" ON public.servers;
DROP POLICY IF EXISTS "Users can join public servers" ON public.server_members;

-- 2. Recreate servers INSERT policy
CREATE POLICY "Authenticated users can create servers"
  ON public.servers FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' 
    AND auth.uid() = owner_id
  );

-- 3. Recreate server_members INSERT policy (allows owner + public join)
CREATE POLICY "Users can join public servers"
  ON public.server_members FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
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
```

---

## Still Not Working?

1. **Check the exact error message** in browser console
2. **Check Supabase logs** for detailed error
3. **Verify tables exist** in Table Editor
4. **Verify policies exist** in Policies tab
5. **Try creating a server directly in SQL** to test:

```sql
-- Test insert (replace with your user ID)
INSERT INTO public.servers (name, owner_id, is_public)
VALUES ('Test Server', 'YOUR_USER_ID_HERE', true)
RETURNING *;
```

If this works, the issue is with RLS policies.
If this fails, the issue is with table structure.

---

## Need More Help?

Share:
1. The exact error message from browser console
2. Screenshot of Supabase Table Editor showing tables
3. Screenshot of Policies tab
4. Any errors from Supabase Logs


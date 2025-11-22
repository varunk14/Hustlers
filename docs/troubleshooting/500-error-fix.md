# Fix: 500 Internal Server Error When Creating Server

## The Problem

You're getting a `500 (Internal Server Error)` when trying to create a server. This is a server-side error from Supabase, usually caused by:

1. **Missing trigger function** - The `handle_updated_at()` function doesn't exist
2. **Trigger error** - The trigger is trying to call a non-existent function
3. **Constraint violation** - A database constraint is being violated

## Quick Fix

### Step 1: Run the Fix Script

Go to Supabase Dashboard → SQL Editor and run:

```sql
-- Create the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_server_updated ON public.servers;

CREATE TRIGGER on_server_updated
  BEFORE UPDATE ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

Or use the file: `docs/database/fix-500-error.sql`

### Step 2: Verify Tables Exist

Make sure both tables exist:

1. Go to Supabase Dashboard → Table Editor
2. Check for:
   - ✅ `servers` table
   - ✅ `server_members` table

If they don't exist, run `docs/database/setup-servers.sql` first.

### Step 3: Check Supabase Logs

1. Go to Supabase Dashboard → Logs → Postgres Logs
2. Look for the exact error message
3. The logs will show what's failing

## Common Causes

### Cause 1: Missing Trigger Function

**Error in logs:** `function handle_updated_at() does not exist`

**Solution:** Run the fix script above

### Cause 2: Trigger Trying to Update Non-existent Column

**Error in logs:** `column "updated_at" does not exist`

**Solution:** Make sure the `servers` table has an `updated_at` column:

```sql
-- Check if column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'servers' 
AND column_name = 'updated_at';

-- If it doesn't exist, add it:
ALTER TABLE public.servers 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE 
DEFAULT TIMEZONE('utc'::text, NOW());
```

### Cause 3: RLS Policy Issue

**Error in logs:** `new row violates row-level security policy`

**Solution:** Check the INSERT policy for servers:

```sql
-- Verify the policy exists and is correct
SELECT * FROM pg_policies 
WHERE tablename = 'servers' 
AND policyname = 'Authenticated users can create servers';

-- If it doesn't exist or is wrong, recreate it:
DROP POLICY IF EXISTS "Authenticated users can create servers" ON public.servers;

CREATE POLICY "Authenticated users can create servers"
  ON public.servers FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' 
    AND auth.uid() = owner_id
  );
```

## Complete Diagnostic Query

Run this to check everything:

```sql
-- 1. Check if function exists
SELECT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'handle_updated_at'
) AS function_exists;

-- 2. Check if trigger exists
SELECT EXISTS (
  SELECT 1 FROM pg_trigger 
  WHERE tgname = 'on_server_updated'
) AS trigger_exists;

-- 3. Check if table has updated_at column
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'servers' 
  AND column_name = 'updated_at'
) AS column_exists;

-- 4. Check RLS policies
SELECT * FROM pg_policies 
WHERE tablename = 'servers';
```

## Still Not Working?

1. **Check Supabase Logs** - Go to Dashboard → Logs → Postgres Logs
2. **Look for the exact error** - It will tell you what's wrong
3. **Share the error message** - I can help debug further

## Alternative: Disable Trigger Temporarily

If you want to test without the trigger:

```sql
-- Disable the trigger
ALTER TABLE public.servers DISABLE TRIGGER on_server_updated;

-- Try creating a server

-- Re-enable when fixed
ALTER TABLE public.servers ENABLE TRIGGER on_server_updated;
```

But it's better to fix the trigger properly.


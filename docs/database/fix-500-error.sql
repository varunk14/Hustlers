-- Fix for 500 Internal Server Error when creating servers
-- This usually happens if the trigger function doesn't exist

-- Step 1: Check if handle_updated_at function exists, create if not
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Drop the trigger if it exists (to recreate it)
DROP TRIGGER IF EXISTS on_server_updated ON public.servers;

-- Step 3: Create the trigger
CREATE TRIGGER on_server_updated
  BEFORE UPDATE ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Step 4: Verify the trigger was created
-- You can check this in Supabase Dashboard → Database → Triggers


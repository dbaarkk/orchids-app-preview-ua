## How to Fix the "invalid input syntax for type integer" Error

The screenshot shows an error (`invalid input syntax for type integer: '{"car-wash":1,...}'`) when trying to purchase a package. This happens because the column `remaining_allowances` in your `user_packages` table (and likely `service_allowances` in your `packages` table) is incorrectly set to the **`INTEGER`** data type instead of **`JSONB`** in your Supabase database.

You must run the following SQL command in your **Supabase SQL Editor** to alter the column types to JSONB so they can correctly store the service arrays:

```sql
-- 1. Fix the packages table
ALTER TABLE public.packages
  DROP COLUMN IF EXISTS service_allowances;

ALTER TABLE public.packages
  ADD COLUMN service_allowances JSONB DEFAULT '{}'::jsonb;

-- 2. Fix the user_packages table
ALTER TABLE public.user_packages
  DROP COLUMN IF EXISTS remaining_allowances;

ALTER TABLE public.user_packages
  ADD COLUMN remaining_allowances JSONB DEFAULT '{}'::jsonb;

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
```

After running this, the payment checkout will work perfectly without throwing that integer parsing error.

To fix the backend database schema to support package service allowances, please run the following SQL command in your Supabase SQL Editor:

```sql
ALTER TABLE public.packages ADD COLUMN service_allowances JSONB;
```

This will add the missing column and correctly allow the packages feature to persist which services are included when a package is created.

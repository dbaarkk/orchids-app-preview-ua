import { createClient } from '@supabase/supabase-js' ; const newUrl = 'https://kytruenglakruszzjljq.supabase.co' ; const newServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5dHJ1ZW5nbGFrcnVzenpqbGpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQyNjE4OCwiZXhwIjoyMDg1MDAyMTg4fQ.68_AqfQXOXYS-NKgc-VTLj88DkcAqPs7N_Ks-183lJ8' ; const newSupa = createClient(newUrl, newServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) ; // Create tables using pg_net or similar - we'll use fetch to call the SQL endpoint
// Supabase has a /pg endpoint we can try, or we can use the dashboard API
// Actually let's just try creating a simple function and calling it

// Let's try the approach of using the Supabase REST API to create an exec_sql function first
// Or better: we check if we can use the supabase management API

// Method: Use the /rest/v1/rpc endpoint to call a function
// First, let's check what's available - actually let's just try inserting into a table
// and if it doesn't exist, we know we need to create it differently

// Let's use the pg endpoint
const sqlStatements = [
  `CREATE TABLE IF NOT EXISTS profiles (
    id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text NOT NULL UNIQUE,
    full_name text,
    phone text,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    location_address text,
    location_coords jsonb
  )`,
  `CREATE TABLE IF NOT EXISTS bookings (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    service_name text NOT NULL,
    booking_date timestamptz,
    status text DEFAULT 'pending',
    total_amount numeric,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
    vehicle_type text,
    vehicle_number text,
    address text,
    notes text,
    preferred_date_time text,
    preferred_time text,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS device_tokens (
    id bigint NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    token text NOT NULL UNIQUE,
    platform text,
    created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
  )`
] ; // Try using the management API
for (const sql of sqlStatements) {
  console.log('Executing:', sql.substring(0, 60) + '...') ; const res = await fetch(`https://kytruenglakruszzjljq.supabase.co/pg`, {
    method: 'POST',
    headers: {
      'apikey': newServiceKey,
      'Authorization': `Bearer ${newServiceKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  }) ; console.log('Status:', res.status) ; const text = await res.text() ; console.log('Response:', text.substring(0, 200)) ; }

import { createClient } from '@supabase/supabase-js' ; const oldUrl = 'https://rrivutwmhvqlpoelwdob.supabase.co' ; const oldServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJyaXZ1dHdtaHZxbHBvZWx3ZG9iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTE0MTM0OCwiZXhwIjoyMDg0NzE3MzQ4fQ.4Iv7-q75Jp7CUU4xWVkxWwYEWaoAQfUfHHicP3HZMDw' ; const newUrl = 'https://kytruenglakruszzjljq.supabase.co' ; const newServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5dHJ1ZW5nbGFrcnVzenpqbGpxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTQyNjE4OCwiZXhwIjoyMDg1MDAyMTg4fQ.68_AqfQXOXYS-NKgc-VTLj88DkcAqPs7N_Ks-183lJ8' ; const oldSupa = createClient(oldUrl, oldServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) ; const newSupa = createClient(newUrl, newServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) ; // Step 1: List all users from old project
const { data: usersData, error: usersError } = await oldSupa.auth.admin.listUsers({ perPage: 1000 }) ; if (usersError) {
  console.error('Error listing users:', usersError) ; process.exit(1) ; }
console.log(`Found ${usersData.users.length} users in old project`) ; // Step 2: Create users in new project
for (const user of usersData.users) {
  console.log(`Creating user: ${user.email}`) ; const { data, error } = await newSupa.auth.admin.createUser({
    email: user.email,
    password: 'TempPassword123!',
    email_confirm: true,
    user_metadata: user.user_metadata,
    app_metadata: user.app_metadata
  }) ; if (error) {
    if (error.message.includes('already been registered')) {
      console.log(`  User ${user.email} already exists, skipping`) ; } else {
      console.error(`  Error creating user ${user.email}:`, error.message) ; }
  } else {
    console.log(`  Created user ${user.email} with new id: ${data.user.id}`) ; }
}

// Build email->new_id mapping
const { data: newUsersData } = await newSupa.auth.admin.listUsers({ perPage: 1000 }) ; const emailToNewId = {} ; const oldIdToNewId = {} ; for (const newUser of newUsersData.users) {
  emailToNewId[newUser.email] = newUser.id ; }
// Map old user IDs to new user IDs
for (const oldUser of usersData.users) {
  if (emailToNewId[oldUser.email]) {
    oldIdToNewId[oldUser.id] = emailToNewId[oldUser.email] ; }
}
console.log('ID mapping:', JSON.stringify(oldIdToNewId, null, 2)) ; // Step 3: Create tables via SQL (using the REST API rpc)
// We need to create the tables. Let's use the management API directly.
// Actually, we can create tables by inserting data if they exist. Let's first create them.

// Use pg-meta or direct SQL - we'll create tables via fetch to the management API
// Actually, the simplest approach is to use the SQL editor endpoint

// Create profiles table
const createProfilesSQL = `
CREATE TABLE IF NOT EXISTS profiles (
  id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  location_address text,
  location_coords jsonb
) ; ` ; const createBookingsSQL = `
CREATE TABLE IF NOT EXISTS bookings (
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
) ; ` ; const createDeviceTokensSQL = `
CREATE TABLE IF NOT EXISTS device_tokens (
  id bigint NOT NULL PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
) ; ` ; // Execute SQL via the Supabase pg endpoint 
async function execSQL(sql) {
  const res = await fetch(`${newUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': newServiceKey,
      'Authorization': `Bearer ${newServiceKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql })
  }) ; return res ; }

// Since we can't run DDL via PostgREST easily, let's output the SQL and mapping
console.log('\n--- SQL TO RUN ON NEW PROJECT ---') ; console.log(createProfilesSQL) ; console.log(createBookingsSQL) ; console.log(createDeviceTokensSQL) ; console.log('--- END SQL ---\n') ; // Output profiles data with mapped IDs
const { data: profiles } = await oldSupa.from('profiles').select('*') ; console.log('\n--- PROFILES DATA (mapped) ---') ; for (const p of profiles) {
  const newId = oldIdToNewId[p.id] ; if (newId) {
    console.log(JSON.stringify({ ...p, id: newId })) ; } else {
    console.log(`SKIP profile ${p.email} - no matching new user`) ; }
}

const { data: bookings } = await oldSupa.from('bookings').select('*') ; console.log('\n--- BOOKINGS DATA (mapped) ---') ; for (const b of bookings) {
  const newId = oldIdToNewId[b.user_id] ; if (newId) {
    console.log(JSON.stringify({ ...b, user_id: newId })) ; } else {
    console.log(`SKIP booking ${b.id} - no matching new user for ${b.user_id}`) ; }
}


-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text,
    full_name text,
    phone text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    location_address text,
    location_coords jsonb
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_name text,
    booking_date timestamptz,
    status text DEFAULT 'pending',
    total_amount numeric,
    created_at timestamptz DEFAULT now(),
    vehicle_type text,
    vehicle_number text,
    address text,
    notes text,
    preferred_date_time text,
    preferred_time text
);

-- Device Tokens Table
CREATE TABLE IF NOT EXISTS public.device_tokens (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    token text UNIQUE,
    platform text,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS (Optional, but user said keep it disabled for simplicity in some contexts, 
-- but following the current project's state)
-- The user instructions for SQL tool say: "When creating tables in Supabase, do NOT set any RLS policies on tables. Keep RLS disabled for simplicity."
-- So I will not add RLS policies.

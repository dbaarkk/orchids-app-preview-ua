-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text,
    full_name text,
    phone text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    address_line1 text,
    address_line2 text,
    state text DEFAULT 'Chhattisgarh',
    city text DEFAULT 'Raipur',
    pincode text,
    location_address text,
    location_coords jsonb,
    verified boolean DEFAULT false,
    blocked boolean DEFAULT false,
    wallet_balance numeric DEFAULT 0
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_name text,
    booking_date timestamptz,
    status text DEFAULT 'Pending',
    total_amount numeric,
    created_at timestamptz DEFAULT now(),
    vehicle_type text,
    vehicle_number text,
    vehicle_make_model text,
    service_mode text,
    address text,
    notes text,
    preferred_date_time text,
    preferred_time text,
    location_coords jsonb,
    payment_status text DEFAULT 'unpaid',
    payment_method text DEFAULT 'pay_later',
    coupon_code text,
    discount_amount numeric DEFAULT 0,
    rescheduled_by text,
    user_name text,
    user_email text,
    user_phone text
);

-- Device Tokens Table
CREATE TABLE IF NOT EXISTS public.device_tokens (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    token text UNIQUE,
    platform text,
    created_at timestamptz DEFAULT now()
);

-- Service Prices Table
CREATE TABLE IF NOT EXISTS public.service_prices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id text UNIQUE,
    service_name text,
    price_sedan numeric DEFAULT 0,
    price_hatchback numeric DEFAULT 0,
    price_suv numeric DEFAULT 0,
    price_luxury numeric DEFAULT 0,
    updated_at timestamptz DEFAULT now()
);

-- Coupons Table
CREATE TABLE IF NOT EXISTS public.coupons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text UNIQUE,
    discount_percent numeric,
    active boolean DEFAULT true,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

-- Wallet Transactions Table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount numeric,
    type text, -- 'credit' or 'debit'
    description text,
    booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

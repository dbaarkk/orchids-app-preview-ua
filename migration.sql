-- SQL Migration to add display_id to profiles
-- Run this in your Supabase SQL Editor

-- 1. Create a sequence for the display ID
CREATE SEQUENCE IF NOT EXISTS user_display_id_seq START 1;

-- 2. Add the display_id column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_id text;

-- 3. Create a function to format and set the display_id (e.g., 0001, 0002)
CREATE OR REPLACE FUNCTION format_display_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.display_id IS NULL THEN
        NEW.display_id := LPAD(nextval('user_display_id_seq')::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create a trigger to automatically set display_id for new users
DROP TRIGGER IF EXISTS set_display_id ON public.profiles;
CREATE TRIGGER set_display_id
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION format_display_id();

-- 5. Backfill existing users with display_id based on their join date
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT id FROM public.profiles WHERE display_id IS NULL ORDER BY created_at ASC) LOOP
        UPDATE public.profiles SET display_id = LPAD(nextval('user_display_id_seq')::text, 4, '0') WHERE id = r.id;
    END LOOP;
END $$;

-- Add new fields to profiles table for account management
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS linkedin_url text;
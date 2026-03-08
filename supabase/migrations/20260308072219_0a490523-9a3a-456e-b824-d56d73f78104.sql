
-- Add gender field to profiles table
ALTER TABLE public.profiles ADD COLUMN gender text;

-- Add gender field to student_profiles table
ALTER TABLE public.student_profiles ADD COLUMN gender text;

-- Add gender field to applications table
ALTER TABLE public.applications ADD COLUMN gender text;

-- Add is_banned column to profiles for banning accounts
ALTER TABLE public.profiles ADD COLUMN is_banned boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN banned_reason text;
ALTER TABLE public.profiles ADD COLUMN banned_at timestamp with time zone;

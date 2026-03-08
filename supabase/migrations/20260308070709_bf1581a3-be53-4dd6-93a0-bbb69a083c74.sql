
-- Add graduation_status to student_profiles
ALTER TABLE public.student_profiles ADD COLUMN IF NOT EXISTS graduation_status text DEFAULT NULL;
-- Values: NULL (active), 'graduated', 'promoted'

-- Enable pg_cron and pg_net extensions for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

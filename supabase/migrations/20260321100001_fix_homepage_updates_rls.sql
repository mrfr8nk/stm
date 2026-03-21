-- Fix homepage_updates and school_settings RLS policies to allow anonymous access
-- This migration will be applied when the base tables exist

-- Add public read access for school_settings (headmaster info on homepage)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_settings') THEN
    DROP POLICY IF EXISTS "Public can view school settings" ON public.school_settings;
    EXECUTE 'CREATE POLICY "Public can view school settings" ON public.school_settings FOR SELECT TO anon, authenticated USING (true)';
  END IF;
END $$;

-- Ensure homepage_updates can be read by anonymous users
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'homepage_updates') THEN
    DROP POLICY IF EXISTS "Public can view active updates" ON public.homepage_updates;
    EXECUTE 'CREATE POLICY "Public can view active updates" ON public.homepage_updates FOR SELECT TO anon, authenticated USING (is_active = true)';
  END IF;
END $$;

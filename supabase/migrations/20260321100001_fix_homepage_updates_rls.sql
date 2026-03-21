-- Fix homepage updates RLS policy to allow anonymous access
DROP POLICY IF EXISTS "Anyone can view active homepage updates" ON public.homepage_updates;

CREATE POLICY "Anyone can view active homepage updates"
  ON public.homepage_updates FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Also ensure school_settings is accessible to anonymous users
DROP POLICY IF EXISTS "Anyone can read school settings" ON public.school_settings;

CREATE POLICY "Anyone can read school settings"
  ON public.school_settings FOR SELECT
  TO anon, authenticated
  USING (true);

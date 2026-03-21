-- Fix RLS policies for homepage_updates to allow admins to see all updates
-- while public users only see active ones

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can view active homepage updates" ON public.homepage_updates;

-- Create a new policy that allows:
-- 1. Anyone to see active updates (for public homepage)
-- 2. Admins to see all updates (for admin dashboard)
CREATE POLICY "Select homepage updates"
  ON public.homepage_updates FOR SELECT
  USING (
    is_active = true 
    OR public.has_role(auth.uid(), 'admin')
  );

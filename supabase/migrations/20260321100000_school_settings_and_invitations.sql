-- Create school_settings table for dynamic content (headmaster, about, etc)
CREATE TABLE IF NOT EXISTS public.school_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

-- Public can read settings
CREATE POLICY "Anyone can read school settings" ON public.school_settings
  FOR SELECT TO authenticated, anon
  USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can manage school settings" ON public.school_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default headmaster settings
INSERT INTO public.school_settings (setting_key, setting_value)
VALUES ('headmaster', '{"name": "Mr. Nyabako", "title": "Head Master", "image_url": null, "quote": "St. Mary''s High School has been and will remain a fountain of wisdom, and it is the wise who will drink from this great fountain of wisdom.", "message": "Our success as a school is an outcome of an ever-deepening culture of industry and commitment to study on the part of our learners, complimented by a hard-working team of tried and tested professionals.", "closing": "As we stand guided by our motto: \"We Think We Can and Indeed We Can\" — I invite you to join our community where excellence is not just a goal, but a way of life."}'::jsonb)
ON CONFLICT (setting_key) DO NOTHING;

-- Create pending_invitations table for admin-initiated user creation
CREATE TABLE IF NOT EXISTS public.pending_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  class_id UUID REFERENCES public.classes(id),
  form INTEGER,
  level TEXT,
  invitation_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  activated_at TIMESTAMP WITH TIME ZONE,
  activated_user_id UUID
);

-- Enable RLS
ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can manage invitations
CREATE POLICY "Admins can manage invitations" ON public.pending_invitations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Anyone can read invitation by token (for activation)
CREATE POLICY "Anyone can read invitation by token" ON public.pending_invitations
  FOR SELECT TO anon, authenticated
  USING (true);

-- Create index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_pending_invitations_token ON public.pending_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_pending_invitations_email ON public.pending_invitations(email);

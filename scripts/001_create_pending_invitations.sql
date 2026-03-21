-- Create pending_invitations table for admin-created user invitations
CREATE TABLE IF NOT EXISTS public.pending_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'parent', 'admin')),
  invite_token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES auth.users(id),
  class_id UUID REFERENCES public.classes(id),
  form INTEGER,
  level TEXT CHECK (level IN ('zjc', 'o_level', 'a_level')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for token lookup
CREATE INDEX IF NOT EXISTS idx_pending_invitations_token ON public.pending_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_pending_invitations_email ON public.pending_invitations(email);

-- Enable RLS
ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

-- Admins can view all invitations
CREATE POLICY "Admins can view all invitations" ON public.pending_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Admins can create invitations
CREATE POLICY "Admins can create invitations" ON public.pending_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Allow public read of unused invitations by token (for activation page)
CREATE POLICY "Public can read valid invitations by token" ON public.pending_invitations
  FOR SELECT
  USING (used_at IS NULL AND expires_at > NOW());

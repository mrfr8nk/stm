
-- System settings key-value store for admin toggles
CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can read settings"
  ON public.system_settings FOR SELECT
  USING (true);

-- Only admins can manage settings
CREATE POLICY "Admins can manage settings"
  ON public.system_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default: reports are locked by default
INSERT INTO public.system_settings (key, value) VALUES ('reports_locked', 'true');


-- Security alerts table for AI-detected suspicious activities
CREATE TABLE public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  description text NOT NULL,
  user_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamp with time zone,
  resolution_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage security alerts"
  ON public.security_alerts FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Index for fast lookups
CREATE INDEX idx_security_alerts_created ON public.security_alerts(created_at DESC);
CREATE INDEX idx_security_alerts_severity ON public.security_alerts(severity);
CREATE INDEX idx_security_alerts_resolved ON public.security_alerts(is_resolved);

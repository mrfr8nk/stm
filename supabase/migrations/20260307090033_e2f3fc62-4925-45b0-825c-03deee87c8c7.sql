
CREATE TABLE public.petty_cash (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  payment_method TEXT DEFAULT 'cash',
  receipt_reference TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  recorded_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.petty_cash ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage petty cash"
  ON public.petty_cash FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

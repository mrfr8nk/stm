
-- Create fee_payments table to track individual partial payments
CREATE TABLE public.fee_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fee_record_id UUID NOT NULL REFERENCES public.fee_records(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  amount_usd NUMERIC NOT NULL,
  amount_original NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT NOT NULL DEFAULT 'cash',
  receipt_number TEXT,
  receipt_image_url TEXT,
  notes TEXT,
  paid_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage fee payments" ON public.fee_payments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can view own fee payments" ON public.fee_payments
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "Parents can view linked children fee payments" ON public.fee_payments
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.parent_student_links
    WHERE parent_student_links.parent_id = auth.uid()
    AND parent_student_links.student_id = fee_payments.student_id
  ));

CREATE POLICY "Teachers can view fee payments" ON public.fee_payments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'teacher'));

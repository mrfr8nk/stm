
CREATE TABLE public.report_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number text NOT NULL UNIQUE,
  student_id uuid NOT NULL,
  student_name text NOT NULL,
  student_code text,
  class_name text,
  level text,
  term text NOT NULL,
  academic_year integer NOT NULL,
  average_mark numeric,
  subjects_count integer,
  position integer,
  total_students integer,
  generated_by uuid,
  generated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.report_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can verify reports" ON public.report_verifications FOR SELECT USING (true);
CREATE POLICY "Authenticated can create verifications" ON public.report_verifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage verifications" ON public.report_verifications FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

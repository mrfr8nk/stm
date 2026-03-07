
-- Applications table for student enrollment applications
CREATE TABLE public.applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  date_of_birth DATE,
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_email TEXT,
  address TEXT,
  level public.academic_level NOT NULL DEFAULT 'o_level',
  form INTEGER NOT NULL DEFAULT 1,
  previous_school TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage applications" ON public.applications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can submit applications" ON public.applications FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can view own application by email" ON public.applications FOR SELECT TO anon, authenticated USING (true);

-- Soft delete support: add deleted_at to key tables
ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.fee_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.access_codes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Academic sessions table for term date management
CREATE TABLE public.academic_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  academic_year INTEGER NOT NULL,
  term public.school_term NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(academic_year, term)
);

ALTER TABLE public.academic_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sessions" ON public.academic_sessions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can view sessions" ON public.academic_sessions FOR SELECT TO anon, authenticated USING (true);

-- Insert default sessions for 2025-2035
INSERT INTO public.academic_sessions (academic_year, term, start_date, end_date, is_current) VALUES
(2025, 'term_1', '2025-01-14', '2025-04-11', false),
(2025, 'term_2', '2025-05-06', '2025-07-25', false),
(2025, 'term_3', '2025-09-09', '2025-11-28', false),
(2026, 'term_1', '2026-01-13', '2026-04-10', true),
(2026, 'term_2', '2026-05-05', '2026-07-24', false),
(2026, 'term_3', '2026-09-08', '2026-11-27', false),
(2027, 'term_1', '2027-01-12', '2027-04-09', false),
(2027, 'term_2', '2027-05-04', '2027-07-23', false),
(2027, 'term_3', '2027-09-07', '2027-11-26', false),
(2028, 'term_1', '2028-01-11', '2028-04-07', false),
(2028, 'term_2', '2028-05-02', '2028-07-21', false),
(2028, 'term_3', '2028-09-05', '2028-11-24', false),
(2029, 'term_1', '2029-01-09', '2029-04-06', false),
(2029, 'term_2', '2029-05-01', '2029-07-20', false),
(2029, 'term_3', '2029-09-04', '2029-11-23', false),
(2030, 'term_1', '2030-01-14', '2030-04-12', false),
(2030, 'term_2', '2030-05-06', '2030-07-25', false),
(2030, 'term_3', '2030-09-09', '2030-11-29', false),
(2031, 'term_1', '2031-01-13', '2031-04-11', false),
(2031, 'term_2', '2031-05-05', '2031-07-25', false),
(2031, 'term_3', '2031-09-08', '2031-11-28', false),
(2032, 'term_1', '2032-01-12', '2032-04-09', false),
(2032, 'term_2', '2032-05-03', '2032-07-23', false),
(2032, 'term_3', '2032-09-06', '2032-11-26', false),
(2033, 'term_1', '2033-01-11', '2033-04-08', false),
(2033, 'term_2', '2033-05-02', '2033-07-22', false),
(2033, 'term_3', '2033-09-05', '2033-11-25', false),
(2034, 'term_1', '2034-01-10', '2034-04-07', false),
(2034, 'term_2', '2034-05-01', '2034-07-21', false),
(2034, 'term_3', '2034-09-04', '2034-11-24', false),
(2035, 'term_1', '2035-01-08', '2035-04-04', false),
(2035, 'term_2', '2035-04-29', '2035-07-18', false),
(2035, 'term_3', '2035-09-02', '2035-11-21', false);

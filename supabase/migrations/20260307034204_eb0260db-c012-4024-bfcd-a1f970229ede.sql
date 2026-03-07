
-- =============================================
-- ST. MARY'S HIGH SCHOOL MANAGEMENT SYSTEM
-- Complete Database Schema
-- =============================================

-- Role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

-- Academic level enum
CREATE TYPE public.academic_level AS ENUM ('zjc', 'o_level', 'a_level');

-- Attendance status enum
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

-- Term enum
CREATE TYPE public.school_term AS ENUM ('term_1', 'term_2', 'term_3');

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- USER ROLES TABLE
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ACCESS CODES TABLE (for teacher/student signup)
-- =============================================
CREATE TABLE public.access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  role app_role NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  used_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- CLASSES TABLE
-- =============================================
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  level academic_level NOT NULL,
  form INTEGER NOT NULL,
  stream TEXT,
  academic_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  class_teacher_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SUBJECTS TABLE
-- =============================================
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  level academic_level,
  is_compulsory BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TEACHER PROFILES (extended info)
-- =============================================
CREATE TABLE public.teacher_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  employee_id TEXT,
  department TEXT,
  qualification TEXT,
  date_joined DATE,
  subjects_taught TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STUDENT PROFILES (extended info)
-- =============================================
CREATE TABLE public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  student_id TEXT UNIQUE,
  class_id UUID REFERENCES public.classes(id),
  level academic_level NOT NULL,
  form INTEGER NOT NULL,
  date_of_birth DATE,
  guardian_name TEXT,
  guardian_phone TEXT,
  guardian_email TEXT,
  address TEXT,
  enrollment_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TEACHER-SUBJECT-CLASS ASSIGNMENTS
-- =============================================
CREATE TABLE public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  academic_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, subject_id, class_id, academic_year)
);

ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- GRADES TABLE
-- =============================================
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES auth.users(id) NOT NULL,
  term school_term NOT NULL,
  academic_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  mark NUMERIC(5,2) NOT NULL CHECK (mark >= 0 AND mark <= 100),
  grade_letter TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, subject_id, term, academic_year)
);

ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ATTENDANCE TABLE
-- =============================================
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status attendance_status NOT NULL DEFAULT 'present',
  marked_by UUID REFERENCES auth.users(id) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- =============================================
-- ANNOUNCEMENTS TABLE
-- =============================================
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) NOT NULL,
  target_role app_role,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- =============================================
-- GRADING SCALES TABLE
-- =============================================
CREATE TABLE public.grading_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level academic_level NOT NULL,
  grade_letter TEXT NOT NULL,
  min_mark NUMERIC(5,2) NOT NULL,
  max_mark NUMERIC(5,2) NOT NULL,
  description TEXT,
  UNIQUE(level, grade_letter)
);

ALTER TABLE public.grading_scales ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FEE RECORDS TABLE
-- =============================================
CREATE TABLE public.fee_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  term school_term NOT NULL,
  academic_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now()),
  amount_due NUMERIC(10,2) NOT NULL,
  amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_date DATE,
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fee_records ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SECURITY DEFINER FUNCTION FOR ROLE CHECKS
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teacher_profiles_updated_at BEFORE UPDATE ON public.teacher_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON public.grades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- GRADE CALCULATION FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.calculate_grade(_mark NUMERIC, _level academic_level)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT grade_letter INTO result
  FROM public.grading_scales
  WHERE level = _level AND _mark >= min_mark AND _mark <= max_mark
  LIMIT 1;
  
  IF result IS NULL THEN
    -- Default grading if no scale configured
    IF _level = 'o_level' THEN
      CASE
        WHEN _mark >= 70 THEN result := 'A';
        WHEN _mark >= 60 THEN result := 'B';
        WHEN _mark >= 50 THEN result := 'C';
        WHEN _mark >= 40 THEN result := 'D';
        ELSE result := 'U';
      END CASE;
    ELSIF _level = 'a_level' THEN
      CASE
        WHEN _mark >= 76 THEN result := 'A';
        WHEN _mark >= 67 THEN result := 'B';
        WHEN _mark >= 55 THEN result := 'C';
        WHEN _mark >= 45 THEN result := 'D';
        WHEN _mark >= 35 THEN result := 'E';
        ELSE result := 'O';
      END CASE;
    ELSE -- zjc
      CASE
        WHEN _mark >= 75 THEN result := 'A';
        WHEN _mark >= 65 THEN result := 'B';
        WHEN _mark >= 50 THEN result := 'C';
        WHEN _mark >= 40 THEN result := 'D';
        ELSE result := 'U';
      END CASE;
    END IF;
  END IF;
  
  RETURN result;
END;
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Profiles: users can read all profiles, update own
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles: only admins can manage, users can read own
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- Allow self-insert during signup (via access code)
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Access codes: admins manage, anyone can read to validate
CREATE POLICY "Admins can manage access codes" ON public.access_codes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read unused codes for validation" ON public.access_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can mark codes as used" ON public.access_codes FOR UPDATE TO authenticated USING (used = false);

-- Classes: viewable by all authenticated
CREATE POLICY "Anyone can view classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage classes" ON public.classes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Subjects: viewable by all
CREATE POLICY "Anyone can view subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage subjects" ON public.subjects FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Teacher profiles
CREATE POLICY "Anyone can view teacher profiles" ON public.teacher_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can update own profile" ON public.teacher_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Teachers can insert own profile" ON public.teacher_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage teacher profiles" ON public.teacher_profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Student profiles
CREATE POLICY "Students can view own profile" ON public.student_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Teachers can view student profiles" ON public.student_profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Admins can view all student profiles" ON public.student_profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Students can update own profile" ON public.student_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Students can insert own profile" ON public.student_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage student profiles" ON public.student_profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Teacher assignments
CREATE POLICY "Anyone can view assignments" ON public.teacher_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage assignments" ON public.teacher_assignments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Grades
CREATE POLICY "Students can view own grades" ON public.grades FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Teachers can view grades they entered" ON public.grades FOR SELECT TO authenticated USING (auth.uid() = teacher_id);
CREATE POLICY "Teachers can insert grades" ON public.grades FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'teacher') AND auth.uid() = teacher_id);
CREATE POLICY "Teachers can update own grades" ON public.grades FOR UPDATE TO authenticated USING (auth.uid() = teacher_id);
CREATE POLICY "Admins can manage all grades" ON public.grades FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Attendance
CREATE POLICY "Students can view own attendance" ON public.attendance FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Teachers can view class attendance" ON public.attendance FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Teachers can mark attendance" ON public.attendance FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Teachers can update attendance" ON public.attendance FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'teacher'));
CREATE POLICY "Admins can manage attendance" ON public.attendance FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Announcements
CREATE POLICY "Anyone can view announcements" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers can create announcements" ON public.announcements FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'teacher') AND auth.uid() = author_id);
CREATE POLICY "Admins can manage announcements" ON public.announcements FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Grading scales
CREATE POLICY "Anyone can view grading scales" ON public.grading_scales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage grading scales" ON public.grading_scales FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fee records
CREATE POLICY "Students can view own fees" ON public.fee_records FOR SELECT TO authenticated USING (auth.uid() = student_id);
CREATE POLICY "Admins can manage fees" ON public.fee_records FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- SEED DEFAULT GRADING SCALES
-- =============================================
INSERT INTO public.grading_scales (level, grade_letter, min_mark, max_mark, description) VALUES
  ('o_level', 'A', 70, 100, 'Excellent'),
  ('o_level', 'B', 60, 69, 'Very Good'),
  ('o_level', 'C', 50, 59, 'Good'),
  ('o_level', 'D', 40, 49, 'Satisfactory'),
  ('o_level', 'U', 0, 39, 'Ungraded'),
  ('a_level', 'A', 76, 100, 'Excellent'),
  ('a_level', 'B', 67, 75, 'Very Good'),
  ('a_level', 'C', 55, 66, 'Good'),
  ('a_level', 'D', 45, 54, 'Satisfactory'),
  ('a_level', 'E', 35, 44, 'Compensatory Pass'),
  ('a_level', 'O', 0, 34, 'Ordinary'),
  ('zjc', 'A', 75, 100, 'Excellent'),
  ('zjc', 'B', 65, 74, 'Very Good'),
  ('zjc', 'C', 50, 64, 'Good'),
  ('zjc', 'D', 40, 49, 'Satisfactory'),
  ('zjc', 'U', 0, 39, 'Ungraded');

-- =============================================
-- SEED DEFAULT SUBJECTS
-- =============================================
INSERT INTO public.subjects (name, code, level, is_compulsory) VALUES
  ('Mathematics', 'MATH', NULL, true),
  ('English Language', 'ENG', NULL, true),
  ('Shona', 'SHO', NULL, false),
  ('Ndebele', 'NDE', NULL, false),
  ('History', 'HIS', NULL, false),
  ('Geography', 'GEO', NULL, false),
  ('Combined Science', 'SCI', 'o_level', false),
  ('Physics', 'PHY', NULL, false),
  ('Chemistry', 'CHE', NULL, false),
  ('Biology', 'BIO', NULL, false),
  ('Accounts', 'ACC', NULL, false),
  ('Commerce', 'COM', NULL, false),
  ('Computer Science', 'CS', NULL, false),
  ('Agriculture', 'AGR', NULL, false),
  ('Technical Graphics', 'TG', NULL, false),
  ('Food & Nutrition', 'FN', NULL, false),
  ('Fashion & Fabrics', 'FF', NULL, false),
  ('Music', 'MUS', NULL, false),
  ('Art', 'ART', NULL, false),
  ('Physical Education', 'PE', NULL, false);

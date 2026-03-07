
-- Function to generate next student ID in format STM{YEAR}{4-digit-seq}
CREATE OR REPLACE FUNCTION public.generate_student_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_year TEXT;
  next_seq INT;
  new_id TEXT;
BEGIN
  -- Only generate if student_id is null
  IF NEW.student_id IS NOT NULL AND NEW.student_id != '' THEN
    RETURN NEW;
  END IF;

  current_year := EXTRACT(YEAR FROM now())::TEXT;
  
  -- Find the max sequence for this year
  SELECT COALESCE(MAX(
    CASE 
      WHEN student_id ~ ('^STM' || current_year || '\d{4}$') 
      THEN SUBSTRING(student_id FROM 8)::INT 
      ELSE 0 
    END
  ), 0) + 1
  INTO next_seq
  FROM public.student_profiles
  WHERE student_id LIKE 'STM' || current_year || '%';

  new_id := 'STM' || current_year || LPAD(next_seq::TEXT, 4, '0');
  NEW.student_id := new_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-assign student_id on insert
CREATE TRIGGER trg_generate_student_id
  BEFORE INSERT ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_student_id();


-- Add unique constraint on attendance so upsert works properly across multiple days
ALTER TABLE public.attendance ADD CONSTRAINT attendance_student_class_date_unique UNIQUE (student_id, class_id, date);

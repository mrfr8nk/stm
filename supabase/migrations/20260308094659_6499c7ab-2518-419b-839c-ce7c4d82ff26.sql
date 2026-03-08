
-- Allow parents to view grades of their linked children
CREATE POLICY "Parents can view linked children grades"
ON public.grades FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parent_student_links
    WHERE parent_student_links.parent_id = auth.uid()
    AND parent_student_links.student_id = grades.student_id
  )
);

-- Allow parents to view attendance of their linked children
CREATE POLICY "Parents can view linked children attendance"
ON public.attendance FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parent_student_links
    WHERE parent_student_links.parent_id = auth.uid()
    AND parent_student_links.student_id = attendance.student_id
  )
);

-- Allow parents to view fee records of their linked children
CREATE POLICY "Parents can view linked children fees"
ON public.fee_records FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parent_student_links
    WHERE parent_student_links.parent_id = auth.uid()
    AND parent_student_links.student_id = fee_records.student_id
  )
);

-- Allow parents to view monthly tests of their linked children
CREATE POLICY "Parents can view linked children monthly tests"
ON public.monthly_tests FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.parent_student_links
    WHERE parent_student_links.parent_id = auth.uid()
    AND parent_student_links.student_id = monthly_tests.student_id
  )
);

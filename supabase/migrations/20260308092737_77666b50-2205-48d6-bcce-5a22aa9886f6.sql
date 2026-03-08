CREATE POLICY "Parents can insert own links"
ON public.parent_student_links
FOR INSERT
TO authenticated
WITH CHECK (parent_id = auth.uid());
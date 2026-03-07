

## Plan: Use Database Grading Scales for Live Grade Display

### Problem
Both `TeacherGrades.tsx` and `TeacherMonthlyTests.tsx` use hardcoded grade thresholds (75=A, 60=B, 50=C, 40=D) instead of the admin-configured `grading_scales` table, which has different scales per curriculum level (ZJC, O-Level, A-Level).

### Solution
Fetch the `grading_scales` table once when a class is selected, determine the class's `level` from the selected assignment's `classes.level`, and use those scales to compute the grade letter in real-time as teachers type marks.

### Changes

**1. Both files: Fetch grading scales on class selection**
- Add a `gradingScales` state variable
- When `selectedAssignment` changes, fetch from `grading_scales` where `level` matches `selectedAssignment.classes.level`
- Create a shared helper `getGrade(mark, scales)` that finds the matching scale row where `mark >= min_mark && mark <= max_mark` and returns the `grade_letter`
- Fallback to the existing `calculate_grade` logic if no scales are configured

**2. `TeacherGrades.tsx` — Replace hardcoded grades**
- In the mark entry row (line 250), replace the `{Number(mark)}%` display with the actual grade letter from the scales
- In the distribution chart (lines 73-81), use scale-based grade letters instead of hardcoded ranges
- In `getMarkColor`, use the grade letter to determine color (A/B = green, C = yellow, D/E/F/U = red)

**3. `TeacherMonthlyTests.tsx` — Replace hardcoded grades**
- In the mark entry row, replace the hardcoded `A/B/C/D/F` badge with the scale-derived grade
- In the CSV export `downloadResults` (line 147), use scale-based grades
- In the distribution chart, use scale-based grade ranges
- In `getMarkColor`, use grade letter for color determination

**4. Ensure `classes.level` is available**
- The `teacher_assignments` query already selects `classes(*)`, which includes `level` — no DB changes needed

### No database changes required
The `grading_scales` table already exists with the correct structure.


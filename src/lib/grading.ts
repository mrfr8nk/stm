/**
 * Shared grading utilities using database-driven grading scales.
 */

export interface GradingScale {
  grade_letter: string;
  min_mark: number;
  max_mark: number;
  level: string;
}

/** Look up grade letter from fetched scales. Returns empty string if no match. */
export const getGrade = (mark: number, scales: GradingScale[]): string => {
  if (!scales.length) return fallbackGrade(mark);
  const match = scales.find(s => mark >= s.min_mark && mark <= s.max_mark);
  return match?.grade_letter || "";
};

/** Hardcoded fallback when no scales are configured */
const fallbackGrade = (mark: number): string => {
  if (mark >= 75) return "A";
  if (mark >= 60) return "B";
  if (mark >= 50) return "C";
  if (mark >= 40) return "D";
  return "U";
};

/** Color classes based on grade letter */
export const getGradeColor = (grade: string): string => {
  const g = grade.toUpperCase();
  if (g === "A" || g === "B") return "text-green-600 bg-green-500/10";
  if (g === "C") return "text-yellow-600 bg-yellow-500/10";
  return "text-red-600 bg-red-500/10";
};

/** Border/bg color for mark entry rows */
export const getRowStyle = (grade: string): string => {
  const g = grade.toUpperCase();
  if (g === "A" || g === "B") return "border-l-green-500 bg-green-500/5";
  if (g === "C") return "border-l-yellow-500 bg-yellow-500/5";
  return "border-l-red-500 bg-red-500/5";
};

/** Build distribution data from marks + scales */
export const buildDistribution = (marks: number[], scales: GradingScale[]): { name: string; count: number }[] => {
  const buckets: Record<string, number> = {};
  // Pre-sort scales by min_mark descending for display order
  const sorted = [...scales].sort((a, b) => b.min_mark - a.min_mark);
  sorted.forEach(s => { buckets[`${s.min_mark}-${s.max_mark} (${s.grade_letter})`] = 0; });

  marks.forEach(m => {
    const match = sorted.find(s => m >= s.min_mark && m <= s.max_mark);
    if (match) {
      const key = `${match.min_mark}-${match.max_mark} (${match.grade_letter})`;
      buckets[key]++;
    }
  });

  return Object.entries(buckets)
    .map(([name, count]) => ({ name, count }))
    .filter(r => r.count > 0);
};

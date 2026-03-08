import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Trophy, TrendingUp, Medal, Award } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface RankingsPageProps {
  classFilter?: boolean;
  studentHighlight?: string;
  defaultClass?: string;
}

const RankingsPage = ({ classFilter = true, studentHighlight, defaultClass }: RankingsPageProps) => {
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedTerm, setSelectedTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [c, s, p, g] = await Promise.all([
        supabase.from("classes").select("*").is("deleted_at", null).order("form"),
        supabase.from("subjects").select("*").is("deleted_at", null).order("name"),
        supabase.from("profiles").select("*"),
        supabase.from("grades").select("*").is("deleted_at", null),
      ]);
      setClasses(c.data || []);
      setSubjects(s.data || []);
      setProfiles(p.data || []);
      setGrades(g.data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  // Auto-select default class when provided
  useEffect(() => {
    if (defaultClass && !selectedClass) setSelectedClass(defaultClass);
  }, [defaultClass]);

  const getName = (uid: string) => profiles.find(p => p.user_id === uid)?.full_name || "Unknown";
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || "—";

  // Filter grades
  const filtered = grades.filter(g => {
    const matchClass = !selectedClass || g.class_id === selectedClass;
    const matchYear = !selectedYear || g.academic_year === parseInt(selectedYear);
    const matchTerm = !selectedTerm || g.term === selectedTerm;
    const matchSubject = !selectedSubject || g.subject_id === selectedSubject;
    return matchClass && matchYear && matchTerm && matchSubject;
  });

  // Compute rankings: group by student, calc average
  const studentMap: Record<string, { marks: number[]; total: number; count: number }> = {};
  filtered.forEach(g => {
    if (!studentMap[g.student_id]) studentMap[g.student_id] = { marks: [], total: 0, count: 0 };
    studentMap[g.student_id].marks.push(Number(g.mark));
    studentMap[g.student_id].total += Number(g.mark);
    studentMap[g.student_id].count += 1;
  });

  const rankings = Object.entries(studentMap)
    .map(([uid, data]) => ({
      uid,
      name: getName(uid),
      average: Math.round((data.total / data.count) * 10) / 10,
      subjects: data.count,
      highest: Math.max(...data.marks),
      lowest: Math.min(...data.marks),
    }))
    .sort((a, b) => b.average - a.average)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  // Trends: average per term for top 5 students (or highlighted student)
  const terms = ["term_1", "term_2", "term_3"];
  const termLabel = (t: string) => t.replace("_", " ").toUpperCase();
  const year = parseInt(selectedYear) || new Date().getFullYear();

  const trendStudents = studentHighlight
    ? [studentHighlight]
    : rankings.slice(0, 5).map(r => r.uid);

  const trendData = terms.map(term => {
    const row: any = { term: termLabel(term) };
    trendStudents.forEach(uid => {
      const studentGrades = grades.filter(g =>
        g.student_id === uid &&
        g.term === term &&
        g.academic_year === year &&
        (!selectedClass || g.class_id === selectedClass)
      );
      if (studentGrades.length > 0) {
        const avg = studentGrades.reduce((sum: number, g: any) => sum + Number(g.mark), 0) / studentGrades.length;
        row[getName(uid)] = Math.round(avg * 10) / 10;
      }
    });
    return row;
  });

  const years = [...new Set(grades.map(g => g.academic_year))].sort((a: number, b: number) => b - a);
  const colors = ["hsl(var(--primary))", "hsl(var(--secondary))", "#10b981", "#f59e0b", "#ef4444"];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 text-center text-sm font-bold text-muted-foreground">{rank}</span>;
  };

  if (loading) return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Filters */}
      {classFilter && (
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-3 items-center">
            <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
              <option value="">All Terms</option>
              <option value="term_1">Term 1</option>
              <option value="term_2">Term 2</option>
              <option value="term_3">Term 3</option>
            </select>
            <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
              <option value="">All Subjects (Overall)</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-500" />
            <div>
              <p className="text-lg font-bold">{rankings[0]?.name || "—"}</p>
              <p className="text-xs text-muted-foreground">Top Student</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Award className="w-6 h-6 text-primary" />
            <div>
              <p className="text-lg font-bold">{rankings[0]?.average || 0}%</p>
              <p className="text-xs text-muted-foreground">Top Average</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <div>
              <p className="text-lg font-bold">{rankings.length}</p>
              <p className="text-xs text-muted-foreground">Students Ranked</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Medal className="w-6 h-6 text-secondary" />
            <div>
              <p className="text-lg font-bold">
                {rankings.length > 0 ? Math.round(rankings.reduce((s, r) => s + r.average, 0) / rankings.length) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Class Average</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trends Chart */}
      {trendStudents.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Performance Trends ({year})</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="term" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
                {trendStudents.map((uid, i) => (
                  <Line
                    key={uid}
                    type="monotone"
                    dataKey={getName(uid)}
                    stroke={colors[i % colors.length]}
                    strokeWidth={studentHighlight === uid ? 3 : 2}
                    dot={{ r: 4 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Rankings Table */}
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Trophy className="w-5 h-5" /> Class Rankings</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Average</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Highest</TableHead>
                <TableHead>Lowest</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No grades found for selected filters.</TableCell></TableRow>
              ) : rankings.map(r => (
                <TableRow key={r.uid} className={studentHighlight === r.uid ? "bg-primary/10 font-bold" : r.rank <= 3 ? "bg-yellow-500/5" : ""}>
                  <TableCell><div className="flex items-center gap-1">{getRankIcon(r.rank)}</div></TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className={`font-bold ${r.average >= 70 ? "text-green-600" : r.average >= 50 ? "text-yellow-600" : "text-destructive"}`}>{r.average}%</TableCell>
                  <TableCell>{r.subjects}</TableCell>
                  <TableCell className="text-green-600">{r.highest}%</TableCell>
                  <TableCell className="text-destructive">{r.lowest}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RankingsPage;

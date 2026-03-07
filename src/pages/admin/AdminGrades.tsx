import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { BarChart3, Search, TrendingUp, TrendingDown, Users } from "lucide-react";

const AdminGrades = () => {
  const [grades, setGrades] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Filters
  const [filterClass, setFilterClass] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterTerm, setFilterTerm] = useState("");

  const [stats, setStats] = useState({ totalGrades: 0, avgMark: 0, highest: 0, lowest: 0, passRate: 0 });

  const fetchData = async () => {
    setLoading(true);
    const [gradesRes, classesRes, subjectsRes, profilesRes, rolesRes] = await Promise.all([
      supabase.from("grades").select("*").order("created_at", { ascending: false }),
      supabase.from("classes").select("*").order("form"),
      supabase.from("subjects").select("*").order("name"),
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*"),
    ]);

    const allGrades = gradesRes.data || [];
    setGrades(allGrades);
    setClasses(classesRes.data || []);
    setSubjects(subjectsRes.data || []);

    const profiles = profilesRes.data || [];
    const roles = rolesRes.data || [];
    const studentIds = new Set(roles.filter((r: any) => r.role === "student").map((r: any) => r.user_id));
    const teacherIds = new Set(roles.filter((r: any) => r.role === "teacher").map((r: any) => r.user_id));
    setStudents(profiles.filter((p: any) => studentIds.has(p.user_id)));
    setTeachers(profiles.filter((p: any) => teacherIds.has(p.user_id)));

    // Stats
    if (allGrades.length > 0) {
      const marks = allGrades.map((g: any) => Number(g.mark));
      const avg = marks.reduce((a: number, b: number) => a + b, 0) / marks.length;
      const passing = marks.filter((m: number) => m >= 50).length;
      setStats({
        totalGrades: allGrades.length,
        avgMark: Math.round(avg * 10) / 10,
        highest: Math.max(...marks),
        lowest: Math.min(...marks),
        passRate: Math.round((passing / marks.length) * 100),
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getName = (userId: string) => {
    const all = [...students, ...teachers];
    return all.find((p: any) => p.user_id === userId)?.full_name || "Unknown";
  };

  const getClassName = (classId: string) => classes.find((c: any) => c.id === classId)?.name || "—";
  const getSubjectName = (subjectId: string) => subjects.find((s: any) => s.id === subjectId)?.name || "—";

  const filtered = grades.filter((g: any) => {
    const matchSearch = getName(g.student_id).toLowerCase().includes(search.toLowerCase()) ||
      getSubjectName(g.subject_id).toLowerCase().includes(search.toLowerCase());
    const matchClass = !filterClass || g.class_id === filterClass;
    const matchSubject = !filterSubject || g.subject_id === filterSubject;
    const matchTerm = !filterTerm || g.term === filterTerm;
    return matchSearch && matchClass && matchSubject && matchTerm;
  });

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Grades Overview</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { label: "Total Grades", value: stats.totalGrades, icon: BarChart3, color: "text-primary" },
            { label: "Average Mark", value: `${stats.avgMark}%`, icon: BarChart3, color: "text-secondary" },
            { label: "Highest Mark", value: `${stats.highest}%`, icon: TrendingUp, color: "text-green-600" },
            { label: "Lowest Mark", value: `${stats.lowest}%`, icon: TrendingDown, color: "text-destructive" },
            { label: "Pass Rate", value: `${stats.passRate}%`, icon: Users, color: "text-accent" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`p-2 rounded-lg bg-muted ${s.color}`}><s.icon className="w-5 h-5" /></div>
                <div><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search student or subject..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
              <option value="">All Subjects</option>
              {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)}>
              <option value="">All Terms</option>
              <option value="term_1">Term 1</option>
              <option value="term_2">Term 2</option>
              <option value="term_3">Term 3</option>
            </select>
          </CardContent>
        </Card>

        {/* Grades Table */}
        <Card>
          <CardHeader><CardTitle>All Grades ({filtered.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Mark</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Comment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No grades found. Teachers will enter grades from their portal.</TableCell></TableRow>
                ) : (
                  filtered.map((g: any) => {
                    const mark = Number(g.mark);
                    const markColor = mark >= 70 ? "text-green-600" : mark >= 50 ? "text-yellow-600" : "text-destructive";
                    return (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{getName(g.student_id)}</TableCell>
                        <TableCell>{getSubjectName(g.subject_id)}</TableCell>
                        <TableCell>{getClassName(g.class_id)}</TableCell>
                        <TableCell>{g.term.replace("_", " ").toUpperCase()}</TableCell>
                        <TableCell className={`font-bold ${markColor}`}>{mark}%</TableCell>
                        <TableCell className="font-bold">{g.grade_letter || "—"}</TableCell>
                        <TableCell className="text-sm">{getName(g.teacher_id)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{g.comment || "—"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminGrades;

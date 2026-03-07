import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3, Save, Trash2, Edit, TrendingUp, TrendingDown,
  Award, Users, Download, ArrowUpDown
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend
} from "recharts";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const TeacherMonthlyTests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [existingTests, setExistingTests] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editMark, setEditMark] = useState("");
  const [stats, setStats] = useState({ highest: 0, lowest: 0, average: 0, total: 0, highestName: "", lowestName: "" });
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<"name" | "mark">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    if (!user) return;
    supabase.from("teacher_assignments").select("*, classes(*), subjects(*)").eq("teacher_id", user.id)
      .then(({ data }) => setAssignments(data || []));
  }, [user]);

  useEffect(() => {
    if (!selectedAssignment) return;
    const fetchData = async () => {
      const { data: studentData } = await supabase.from("student_profiles")
        .select("*")
        .eq("class_id", selectedAssignment.class_id).eq("is_active", true);
      // Fetch profile names separately
      const userIds = (studentData || []).map(s => s.user_id);
      const { data: profilesData } = userIds.length > 0
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
        : { data: [] };
      const profileMap = new Map((profilesData || []).map(p => [p.user_id, p.full_name]));
      const enrichedStudents = (studentData || []).map(s => ({ ...s, profiles: { full_name: profileMap.get(s.user_id) || "" } }));
      setStudents(enrichedStudents);

      const { data: tests } = await supabase.from("monthly_tests")
        .select("*").eq("subject_id", selectedAssignment.subject_id)
        .eq("class_id", selectedAssignment.class_id).eq("month", month).eq("academic_year", year)
        .is("deleted_at", null);

      setExistingTests(tests || []);
      const markMap: Record<string, string> = {};
      (tests || []).forEach(t => { markMap[t.student_id] = t.mark.toString(); });
      setMarks(markMap);

      // Stats with student names
      if (tests && tests.length > 0 && studentData) {
        const ms = tests.map(t => ({ mark: Number(t.mark), studentId: t.student_id }));
        const highest = ms.reduce((a, b) => a.mark > b.mark ? a : b);
        const lowest = ms.reduce((a, b) => a.mark < b.mark ? a : b);
        const avg = Math.round(ms.reduce((a, b) => a + b.mark, 0) / ms.length);
        const getName = (sid: string) => enrichedStudents.find(s => s.user_id === sid)?.profiles?.full_name || "Unknown";
        setStats({
          highest: highest.mark, lowest: lowest.mark, average: avg, total: ms.length,
          highestName: getName(highest.studentId), lowestName: getName(lowest.studentId)
        });
      } else {
        setStats({ highest: 0, lowest: 0, average: 0, total: 0, highestName: "", lowestName: "" });
      }

      // Monthly trend
      const { data: allTests } = await supabase.from("monthly_tests")
        .select("month, mark").eq("subject_id", selectedAssignment.subject_id)
        .eq("class_id", selectedAssignment.class_id).eq("academic_year", year).is("deleted_at", null);

      if (allTests && allTests.length > 0) {
        const trendMap: Record<number, number[]> = {};
        allTests.forEach(t => { if (!trendMap[t.month]) trendMap[t.month] = []; trendMap[t.month].push(Number(t.mark)); });
        setMonthlyTrend(Object.entries(trendMap).map(([m, mks]) => ({
          month: MONTHS[Number(m) - 1]?.substring(0, 3),
          average: Math.round(mks.reduce((a, b) => a + b, 0) / mks.length),
          highest: Math.max(...mks),
          lowest: Math.min(...mks),
        })).sort((a, b) => MONTHS.findIndex(m => m.startsWith(a.month)) - MONTHS.findIndex(m => m.startsWith(b.month))));
      } else {
        setMonthlyTrend([]);
      }
    };
    fetchData();
  }, [selectedAssignment, month, year, user]);

  const handleSave = async () => {
    if (!selectedAssignment || !user) return;
    setSaving(true);
    const upserts = students.filter(s => marks[s.user_id]).map(s => ({
      student_id: s.user_id, subject_id: selectedAssignment.subject_id,
      class_id: selectedAssignment.class_id, teacher_id: user.id,
      month, academic_year: year, mark: parseFloat(marks[s.user_id]),
    }));

    const { error } = await supabase.from("monthly_tests").upsert(upserts, { onConflict: "student_id,subject_id,month,academic_year" });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Saved", description: `${upserts.length} test marks saved.` });
      await supabase.from("activity_log").insert({ user_id: user.id, action: "Saved monthly test marks", details: `${selectedAssignment.subjects?.name} - ${MONTHS[month - 1]} ${year}`, entity_type: "monthly_tests" });
    }
    setSaving(false);
  };

  const handleDelete = async (testId: string) => {
    await supabase.from("monthly_tests").update({ deleted_at: new Date().toISOString() }).eq("id", testId);
    toast({ title: "Deleted" });
    setExistingTests(prev => prev.filter(t => t.id !== testId));
  };

  const handleEditSave = async () => {
    if (!editId) return;
    await supabase.from("monthly_tests").update({ mark: parseFloat(editMark) }).eq("id", editId);
    toast({ title: "Updated" });
    setEditId(null);
    if (selectedAssignment) {
      const { data } = await supabase.from("monthly_tests").select("*").eq("subject_id", selectedAssignment.subject_id)
        .eq("class_id", selectedAssignment.class_id).eq("month", month).eq("academic_year", year).is("deleted_at", null);
      setExistingTests(data || []);
    }
  };

  const downloadResults = () => {
    const headers = ["#", "Student Name", "Mark (%)", "Grade"];
    const rows = sortedStudents.map((s, i) => {
      const mark = marks[s.user_id] || "";
      const grade = mark ? (Number(mark) >= 75 ? "A" : Number(mark) >= 60 ? "B" : Number(mark) >= 50 ? "C" : Number(mark) >= 40 ? "D" : "F") : "";
      return [i + 1, s.profiles?.full_name || "", mark, grade];
    });
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `monthly-test-${selectedAssignment?.subjects?.name}-${MONTHS[month - 1]}-${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const getMarkColor = (mark: number) => {
    if (mark >= 75) return "text-green-600 bg-green-500/10";
    if (mark >= 50) return "text-yellow-600 bg-yellow-500/10";
    return "text-red-600 bg-red-500/10";
  };

  const sortedStudents = [...students].sort((a, b) => {
    if (sortBy === "mark") {
      const am = Number(marks[a.user_id] || 0);
      const bm = Number(marks[b.user_id] || 0);
      return sortDir === "asc" ? am - bm : bm - am;
    }
    const an = a.profiles?.full_name || "";
    const bn = b.profiles?.full_name || "";
    return sortDir === "asc" ? an.localeCompare(bn) : bn.localeCompare(an);
  });

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Monthly Tests</h1>
          <p className="text-sm text-muted-foreground">Record and analyse monthly test results</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <select className="border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm" value={year} onChange={e => setYear(Number(e.target.value))}>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Assignment Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {assignments.map(a => (
            <Card key={a.id} className={`cursor-pointer transition-all hover:shadow-md ${selectedAssignment?.id === a.id ? "ring-2 ring-primary bg-primary/5" : ""}`} onClick={() => setSelectedAssignment(a)}>
              <CardContent className="p-4">
                <p className="font-bold text-foreground">{a.subjects?.name || "Subject"}</p>
                <p className="text-sm text-muted-foreground">{a.classes?.name || "Class"}</p>
              </CardContent>
            </Card>
          ))}
          {assignments.length === 0 && <p className="text-muted-foreground">No assignments found.</p>}
        </div>

        {selectedAssignment && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="text-xl font-bold text-green-600">{stats.highest}%</p>
                      <p className="text-xs text-muted-foreground">Highest</p>
                      {stats.highestName && <p className="text-[10px] text-green-600 font-medium truncate max-w-[120px]">{stats.highestName}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-red-500">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                    <div>
                      <p className="text-xl font-bold text-red-600">{stats.lowest}%</p>
                      <p className="text-xs text-muted-foreground">Lowest</p>
                      {stats.lowestName && <p className="text-[10px] text-red-600 font-medium truncate max-w-[120px]">{stats.lowestName}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Award className="w-6 h-6 text-primary" />
                  <div><p className="text-xl font-bold text-primary">{stats.average}%</p><p className="text-xs text-muted-foreground">Class Average</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Users className="w-6 h-6 text-muted-foreground" />
                  <div><p className="text-xl font-bold">{stats.total}/{students.length}</p><p className="text-xs text-muted-foreground">Recorded</p></div>
                </CardContent>
              </Card>
            </div>

            {/* Trend Chart */}
            {monthlyTrend.length > 1 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Performance Trend — {year}</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Legend />
                      <Line type="monotone" dataKey="average" stroke="hsl(var(--primary))" strokeWidth={2} name="Average" dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="highest" stroke="#10b981" strokeWidth={2} name="Highest" dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="lowest" stroke="#ef4444" strokeWidth={2} name="Lowest" dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {monthlyTrend.length === 1 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Distribution — {MONTHS[month - 1]} {year}</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={(() => {
                      const ranges = [
                        { name: "75-100", count: 0 }, { name: "60-74", count: 0 },
                        { name: "50-59", count: 0 }, { name: "40-49", count: 0 }, { name: "0-39", count: 0 }
                      ];
                      existingTests.forEach(t => {
                        const m = Number(t.mark);
                        if (m >= 75) ranges[0].count++;
                        else if (m >= 60) ranges[1].count++;
                        else if (m >= 50) ranges[2].count++;
                        else if (m >= 40) ranges[3].count++;
                        else ranges[4].count++;
                      });
                      return ranges.filter(r => r.count > 0);
                    })()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Students" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Mark Entry */}
            {students.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" /> {selectedAssignment.subjects?.name} — {MONTHS[month - 1]} {year}
                  </CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => {
                      setSortBy(prev => prev === "mark" ? "name" : "mark");
                      setSortDir("desc");
                    }}>
                      <ArrowUpDown className="w-4 h-4 mr-1" /> Sort by {sortBy === "name" ? "Mark" : "Name"}
                    </Button>
                    {existingTests.length > 0 && (
                      <Button variant="outline" size="sm" onClick={downloadResults}>
                        <Download className="w-4 h-4 mr-1" /> Export
                      </Button>
                    )}
                    <Button onClick={handleSave} disabled={saving}>
                      <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save All"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sortedStudents.map((s, i) => {
                      const mark = marks[s.user_id] || "";
                      const existing = existingTests.find(t => t.student_id === s.user_id);
                      return (
                        <div key={s.id} className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                          mark ? (Number(mark) >= 75 ? "bg-green-500/5 border-l-4 border-l-green-500" : Number(mark) >= 50 ? "bg-yellow-500/5 border-l-4 border-l-yellow-500" : "bg-red-500/5 border-l-4 border-l-red-500") : "bg-muted/50 border-l-4 border-l-transparent"
                        }`}>
                          <span className="w-8 text-sm text-muted-foreground font-mono">{i + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-foreground">{s.profiles?.full_name || "Student"}</span>
                          </div>
                          <Input type="number" min={0} max={100} placeholder="Mark" className="w-24"
                            value={mark} onChange={e => setMarks(prev => ({ ...prev, [s.user_id]: e.target.value }))} />
                          {mark && (
                            <span className={`px-2 py-1 rounded text-xs font-bold ${getMarkColor(Number(mark))}`}>
                              {Number(mark) >= 75 ? "A" : Number(mark) >= 60 ? "B" : Number(mark) >= 50 ? "C" : Number(mark) >= 40 ? "D" : "F"}
                            </span>
                          )}
                          {existing && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => { setEditId(existing.id); setEditMark(existing.mark.toString()); }}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(existing.id)} className="text-destructive hover:text-destructive">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <Dialog open={!!editId} onOpenChange={() => setEditId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Edit Mark</DialogTitle></DialogHeader>
            <Input type="number" min={0} max={100} value={editMark} onChange={e => setEditMark(e.target.value)} />
            <Button onClick={handleEditSave} className="w-full">Save</Button>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default TeacherMonthlyTests;

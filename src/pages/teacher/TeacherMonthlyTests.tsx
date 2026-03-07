import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Save, Plus, Trash2, Edit, TrendingUp, TrendingDown, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
  const [stats, setStats] = useState({ highest: 0, lowest: 0, average: 0, total: 0 });
  const [monthlyTrend, setMonthlyTrend] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("teacher_assignments").select("*, classes(*), subjects(*)").eq("teacher_id", user.id)
      .then(({ data }) => setAssignments(data || []));
  }, [user]);

  useEffect(() => {
    if (!selectedAssignment) return;
    const fetchData = async () => {
      const { data: studentData } = await supabase.from("student_profiles")
        .select("*, profiles!student_profiles_user_id_fkey(full_name)")
        .eq("class_id", selectedAssignment.class_id).eq("is_active", true);
      setStudents(studentData || []);

      const { data: tests } = await supabase.from("monthly_tests")
        .select("*").eq("subject_id", selectedAssignment.subject_id)
        .eq("class_id", selectedAssignment.class_id).eq("month", month).eq("academic_year", year)
        .is("deleted_at", null);

      setExistingTests(tests || []);
      const markMap: Record<string, string> = {};
      (tests || []).forEach(t => { markMap[t.student_id] = t.mark.toString(); });
      setMarks(markMap);

      // Stats
      if (tests && tests.length > 0) {
        const ms = tests.map(t => Number(t.mark));
        setStats({ highest: Math.max(...ms), lowest: Math.min(...ms), average: Math.round(ms.reduce((a, b) => a + b, 0) / ms.length), total: ms.length });
      } else {
        setStats({ highest: 0, lowest: 0, average: 0, total: 0 });
      }

      // Monthly trend
      const { data: allTests } = await supabase.from("monthly_tests")
        .select("month, mark").eq("subject_id", selectedAssignment.subject_id)
        .eq("class_id", selectedAssignment.class_id).eq("academic_year", year).is("deleted_at", null);
      
      if (allTests && allTests.length > 0) {
        const trendMap: Record<number, number[]> = {};
        allTests.forEach(t => { if (!trendMap[t.month]) trendMap[t.month] = []; trendMap[t.month].push(Number(t.mark)); });
        setMonthlyTrend(Object.entries(trendMap).map(([m, marks]) => ({
          month: MONTHS[Number(m) - 1]?.substring(0, 3),
          average: Math.round(marks.reduce((a, b) => a + b, 0) / marks.length),
          highest: Math.max(...marks),
          lowest: Math.min(...marks),
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
    // Refresh
    if (selectedAssignment) {
      const { data } = await supabase.from("monthly_tests").select("*").eq("subject_id", selectedAssignment.subject_id)
        .eq("class_id", selectedAssignment.class_id).eq("month", month).eq("academic_year", year).is("deleted_at", null);
      setExistingTests(data || []);
    }
  };

  const getMarkColor = (mark: number) => {
    if (mark >= 75) return "text-green-600 bg-green-500/10";
    if (mark >= 50) return "text-yellow-600 bg-yellow-500/10";
    return "text-red-600 bg-red-500/10";
  };

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Monthly Tests</h1>

        <div className="flex flex-wrap gap-3 items-center">
          <select className="border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm" value={year} onChange={e => setYear(Number(e.target.value))}>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {assignments.map(a => (
            <Card key={a.id} className={`cursor-pointer transition-all hover:shadow-md ${selectedAssignment?.id === a.id ? "ring-2 ring-primary" : ""}`} onClick={() => setSelectedAssignment(a)}>
              <CardContent className="p-4">
                <p className="font-bold text-foreground">{a.subjects?.name || "Subject"}</p>
                <p className="text-sm text-muted-foreground">{a.classes?.name || "Class"}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedAssignment && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                  <div><p className="text-xl font-bold text-green-600">{stats.highest}%</p><p className="text-xs text-muted-foreground">Highest</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                  <div><p className="text-xl font-bold text-red-600">{stats.lowest}%</p><p className="text-xs text-muted-foreground">Lowest</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Award className="w-6 h-6 text-primary" />
                  <div><p className="text-xl font-bold text-primary">{stats.average}%</p><p className="text-xs text-muted-foreground">Average</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-secondary" />
                  <div><p className="text-xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Recorded</p></div>
                </CardContent>
              </Card>
            </div>

            {/* Trend Chart */}
            {monthlyTrend.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Monthly Trend — {year}</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Bar dataKey="average" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Average" />
                      <Bar dataKey="highest" fill="#10b981" radius={[4, 4, 0, 0]} name="Highest" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Mark Entry */}
            {students.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" /> {selectedAssignment.subjects?.name} — {MONTHS[month - 1]} {year}
                  </CardTitle>
                  <Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save"}</Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {students.map((s, i) => {
                      const mark = marks[s.user_id] || "";
                      const existing = existingTests.find(t => t.student_id === s.user_id);
                      return (
                        <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                          <span className="w-8 text-sm text-muted-foreground">{i + 1}.</span>
                          <span className="flex-1 font-medium text-foreground">{s.profiles?.full_name || "Student"}</span>
                          <Input type="number" min={0} max={100} placeholder="Mark" className="w-24"
                            value={mark} onChange={e => setMarks(prev => ({ ...prev, [s.user_id]: e.target.value }))} />
                          {mark && (
                            <span className={`px-2 py-1 rounded text-xs font-bold ${getMarkColor(Number(mark))}`}>
                              {Number(mark) >= 75 ? "A" : Number(mark) >= 50 ? "C" : "F"}
                            </span>
                          )}
                          {existing && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => { setEditId(existing.id); setEditMark(existing.mark.toString()); }}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(existing.id)} className="text-red-500 hover:text-red-700">
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

        {/* Edit Dialog */}
        <Dialog open={!!editId} onOpenChange={() => setEditId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Edit Mark</DialogTitle></DialogHeader>
            <Input type="number" min={0} max={100} value={editMark} onChange={e => setEditMark(e.target.value)} />
            <Button onClick={handleEditSave}>Save</Button>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default TeacherMonthlyTests;

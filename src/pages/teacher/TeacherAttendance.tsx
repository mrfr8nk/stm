import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardCheck, Save, Check, X, Clock, Users, TrendingUp,
  Download, Search, CalendarDays
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

const TeacherAttendance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [summaryStats, setSummaryStats] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const [classTeacherClasses, setClassTeacherClasses] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("teacher_assignments").select("*, classes(*)").eq("teacher_id", user.id),
      supabase.from("classes").select("*").eq("class_teacher_id", user.id).is("deleted_at", null),
    ]).then(([assignRes, ctRes]) => {
      setAssignments(assignRes.data || []);
      setClassTeacherClasses(ctRes.data || []);
    });
  }, [user]);

  const assignmentClassMap = new Map(assignments.map(a => [a.class_id, a.classes]));
  classTeacherClasses.forEach(c => { if (!assignmentClassMap.has(c.id)) assignmentClassMap.set(c.id, c); });
  const uniqueClasses = Array.from(assignmentClassMap.values()).filter(Boolean);

  useEffect(() => {
    if (!selectedClassId || !user) return;
    const fetchAttendance = async () => {
      const { data: spData } = await supabase.from("student_profiles")
        .select("*").eq("class_id", selectedClassId).eq("is_active", true);
      if (spData && spData.length > 0) {
        const userIds = spData.map(s => s.user_id);
        const { data: profilesData } = await supabase.from("profiles")
          .select("user_id, full_name, email").in("user_id", userIds);
        const profileMap: Record<string, any> = {};
        (profilesData || []).forEach(p => { profileMap[p.user_id] = p; });
        setStudents(spData.map(s => ({ ...s, profiles: profileMap[s.user_id] || null })));
      } else {
        setStudents([]);
      }

      const { data: existingAtt } = await supabase.from("attendance").select("*")
        .eq("class_id", selectedClassId).eq("date", date);
      const attMap: Record<string, string> = {};
      (existingAtt || []).forEach(a => { attMap[a.student_id] = a.status; });
      setAttendance(attMap);

      // Weekly stats
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const { data: weekData } = await supabase.from("attendance").select("status, date")
        .eq("class_id", selectedClassId).gte("date", weekAgo.toISOString().split("T")[0]);

      const dayMap: Record<string, Record<string, number>> = {};
      (weekData || []).forEach(a => {
        if (!dayMap[a.date]) dayMap[a.date] = { present: 0, absent: 0, late: 0, excused: 0 };
        dayMap[a.date][a.status] = (dayMap[a.date][a.status] || 0) + 1;
      });
      setWeeklyStats(Object.entries(dayMap).sort().slice(-7).map(([d, s]) => ({
        date: new Date(d).toLocaleDateString("en", { weekday: "short", day: "numeric" }),
        present: s.present || 0, absent: s.absent || 0, late: s.late || 0,
      })));

      const summary: Record<string, number> = { Present: 0, Absent: 0, Late: 0, Excused: 0 };
      (weekData || []).forEach(a => {
        const key = a.status.charAt(0).toUpperCase() + a.status.slice(1);
        summary[key] = (summary[key] || 0) + 1;
      });
      setSummaryStats(Object.entries(summary).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value })));
    };
    fetchAttendance();
  }, [selectedClassId, date, user]);

  const handleSave = async () => {
    if (!selectedClassId || !user) return;
    setSaving(true);
    const records = students.map(s => ({
      student_id: s.user_id, class_id: selectedClassId, date,
      status: (attendance[s.user_id] || "present") as any, marked_by: user.id,
    }));
    const { error } = await supabase.from("attendance").upsert(records, { onConflict: "student_id,date" });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Attendance Saved", description: `Saved for ${records.length} students.` });
      await supabase.from("activity_log").insert({
        user_id: user.id, action: "Marked attendance",
        details: `${date} — ${records.length} students`, entity_type: "attendance"
      });

      // Send attendance alert emails for absent/late students
      const alertStudents = students.filter(s => {
        const status = attendance[s.user_id];
        return status === "absent" || status === "late";
      });
      const formattedDate = new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

      for (const s of alertStudents) {
        const studentEmail = s.profiles?.email;
        const guardianEmail = s.guardian_email;
        const alertData = {
          studentName: s.profiles?.full_name || "Student",
          date: formattedDate,
          status: attendance[s.user_id],
          className: selectedClassName,
        };
        // Email the student
        if (studentEmail) {
          supabase.functions.invoke("send-branded-email", {
            body: { email: studentEmail, type: "attendance_alert", attendance_data: alertData },
          }).catch(() => {});
        }
        // Email the guardian
        if (guardianEmail && guardianEmail !== studentEmail) {
          supabase.functions.invoke("send-branded-email", {
            body: { email: guardianEmail, type: "attendance_alert", attendance_data: alertData },
          }).catch(() => {});
        }
      }
    }
    setSaving(false);
  };

  const markAll = (status: string) => {
    const map: Record<string, string> = {};
    students.forEach(s => { map[s.user_id] = status; });
    setAttendance(map);
  };

  const downloadRegister = () => {
    const headers = ["#", "Student Name", "Student ID", "Status"];
    const rows = filteredStudents.map((s, i) => [
      i + 1, s.profiles?.full_name || "", s.student_id || "", attendance[s.user_id] || "unmarked"
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `attendance-${date}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const statusConfig: Record<string, { bg: string; text: string; border: string; icon: any; label: string }> = {
    present: { bg: "bg-green-500/15", text: "text-green-700", border: "border-green-500", icon: Check, label: "P" },
    absent: { bg: "bg-red-500/15", text: "text-red-700", border: "border-red-500", icon: X, label: "A" },
    late: { bg: "bg-yellow-500/15", text: "text-yellow-700", border: "border-yellow-500", icon: Clock, label: "L" },
    excused: { bg: "bg-blue-500/15", text: "text-blue-700", border: "border-blue-500", icon: CalendarDays, label: "E" },
  };

  const presentCount = Object.values(attendance).filter(v => v === "present").length;
  const absentCount = Object.values(attendance).filter(v => v === "absent").length;
  const lateCount = Object.values(attendance).filter(v => v === "late").length;

  const filteredStudents = students.filter(s =>
    (s.profiles?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.student_id || "").toLowerCase().includes(search.toLowerCase())
  );

  const selectedClassName = uniqueClasses.find(c => c.id === selectedClassId)?.name || "";

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Attendance Register</h1>
          <p className="text-sm text-muted-foreground">Mark and track daily student attendance</p>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm" />
          <div className="flex gap-2">
            {uniqueClasses.map((cls: any) => (
              <Button key={cls.id} variant={selectedClassId === cls.id ? "default" : "outline"} onClick={() => setSelectedClassId(cls.id)} size="sm">
                {cls.name}
              </Button>
            ))}
          </div>
        </div>

        {selectedClassId && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-4 flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-700" />
                  <div><p className="text-xl font-bold text-green-700">{presentCount}</p><p className="text-xs text-muted-foreground">Present</p></div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-red-500">
                <CardContent className="p-4 flex items-center gap-3">
                  <X className="w-5 h-5 text-red-700" />
                  <div><p className="text-xl font-bold text-red-700">{absentCount}</p><p className="text-xs text-muted-foreground">Absent</p></div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="p-4 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-yellow-700" />
                  <div><p className="text-xl font-bold text-yellow-700">{lateCount}</p><p className="text-xs text-muted-foreground">Late</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <Users className="w-5 h-5 text-foreground" />
                  <div><p className="text-xl font-bold">{students.length}</p><p className="text-xs text-muted-foreground">Total</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <div><p className="text-xl font-bold text-primary">{students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0}%</p><p className="text-xs text-muted-foreground">Rate</p></div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {weeklyStats.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-lg">Weekly Trend</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={weeklyStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                        <Legend />
                        <Bar dataKey="present" fill="#10b981" stackId="a" name="Present" />
                        <Bar dataKey="absent" fill="#ef4444" stackId="a" name="Absent" />
                        <Bar dataKey="late" fill="#f59e0b" stackId="a" name="Late" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
              {summaryStats.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-lg">Weekly Summary</CardTitle></CardHeader>
                  <CardContent className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={summaryStats} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {summaryStats.map((_, i) => (
                            <Cell key={i} fill={["#10b981", "#ef4444", "#f59e0b", "#3b82f6"][i]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Attendance Register */}
            {students.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5" /> {selectedClassName} — Attendance Register — {date}
                  </CardTitle>
                  <div className="flex gap-2 flex-wrap items-center">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-44" />
                    </div>
                    <Button size="sm" variant="outline" onClick={() => markAll("present")} className="text-green-700">
                      <Check className="w-4 h-4 mr-1" /> All Present
                    </Button>
                    <Button size="sm" variant="outline" onClick={downloadRegister}>
                      <Download className="w-4 h-4 mr-1" /> Export
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Student ID</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((s, i) => {
                        const status = attendance[s.user_id] || "present";
                        const config = statusConfig[status];
                        return (
                          <TableRow key={s.id} className={config.bg}>
                            <TableCell className="text-muted-foreground font-mono">{i + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${status === "present" ? "bg-green-500" : status === "absent" ? "bg-red-500" : status === "late" ? "bg-yellow-500" : "bg-blue-500"}`} />
                                <span className="font-medium">{s.profiles?.full_name || "Student"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs">{s.student_id || "—"}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1 justify-center">
                                {(["present", "absent", "late", "excused"] as const).map(st => {
                                  const cfg = statusConfig[st];
                                  return (
                                    <button key={st} onClick={() => setAttendance(prev => ({ ...prev, [s.user_id]: st }))}
                                      className={`w-9 h-9 rounded-lg text-xs font-bold border-2 transition-all flex items-center justify-center ${
                                        status === st ? `${cfg.bg} ${cfg.text} ${cfg.border}` : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                                      }`}
                                      title={st.charAt(0).toUpperCase() + st.slice(1)}>
                                      {cfg.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredStudents.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No students found</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {/* Legend */}
                  <div className="flex gap-4 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-500" /> P = Present</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-500" /> A = Absent</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-yellow-500" /> L = Late</span>
                    <span className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-500" /> E = Excused</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!selectedClassId && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Select a class above to mark attendance.
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherAttendance;

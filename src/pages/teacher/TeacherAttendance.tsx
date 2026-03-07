import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, Save, Check, X, Clock, Users, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

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

  useEffect(() => {
    if (!user) return;
    supabase.from("teacher_assignments").select("*, classes(*)").eq("teacher_id", user.id)
      .then(({ data }) => setAssignments(data || []));
  }, [user]);

  const uniqueClasses = Array.from(new Map(assignments.map(a => [a.class_id, a.classes])).values()).filter(Boolean);

  useEffect(() => {
    if (!selectedClassId || !user) return;
    const fetchAttendance = async () => {
      const { data: studentData } = await supabase.from("student_profiles")
        .select("*, profiles!student_profiles_user_id_fkey(full_name)")
        .eq("class_id", selectedClassId).eq("is_active", true);
      setStudents(studentData || []);

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

      // Summary pie
      const summary: Record<string, number> = { Present: 0, Absent: 0, Late: 0, Excused: 0 };
      (weekData || []).forEach(a => { summary[a.status.charAt(0).toUpperCase() + a.status.slice(1)] = (summary[a.status.charAt(0).toUpperCase() + a.status.slice(1)] || 0) + 1; });
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
      await supabase.from("activity_log").insert({ user_id: user.id, action: "Marked attendance", details: `${date} — ${records.length} students`, entity_type: "attendance" });
    }
    setSaving(false);
  };

  const markAll = (status: string) => {
    const map: Record<string, string> = {};
    students.forEach(s => { map[s.user_id] = status; });
    setAttendance(map);
  };

  const statusConfig: Record<string, { bg: string; text: string; border: string; icon: any }> = {
    present: { bg: "bg-green-500/15", text: "text-green-700", border: "border-green-500", icon: Check },
    absent: { bg: "bg-red-500/15", text: "text-red-700", border: "border-red-500", icon: X },
    late: { bg: "bg-yellow-500/15", text: "text-yellow-700", border: "border-yellow-500", icon: Clock },
    excused: { bg: "bg-blue-500/15", text: "text-blue-700", border: "border-blue-500", icon: Users },
  };

  const presentCount = Object.values(attendance).filter(v => v === "present").length;
  const absentCount = Object.values(attendance).filter(v => v === "absent").length;

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Attendance</h1>

        <div className="flex flex-wrap gap-4 items-center">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm" />
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
            {/* Stats overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/15"><Check className="w-5 h-5 text-green-700" /></div>
                  <div><p className="text-xl font-bold text-green-700">{presentCount}</p><p className="text-xs text-muted-foreground">Present</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/15"><X className="w-5 h-5 text-red-700" /></div>
                  <div><p className="text-xl font-bold text-red-700">{absentCount}</p><p className="text-xs text-muted-foreground">Absent</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted"><Users className="w-5 h-5 text-foreground" /></div>
                  <div><p className="text-xl font-bold">{students.length}</p><p className="text-xs text-muted-foreground">Total</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/15"><TrendingUp className="w-5 h-5 text-primary" /></div>
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
                        <Pie data={summaryStats} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                          {summaryStats.map((entry, i) => (
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

            {/* Attendance Marking */}
            {students.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5" /> Mark Attendance — {date}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => markAll("present")} className="text-green-700 border-green-500 hover:bg-green-500/10">
                      <Check className="w-4 h-4 mr-1" /> All Present
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => markAll("absent")} className="text-red-700 border-red-500 hover:bg-red-500/10">
                      <X className="w-4 h-4 mr-1" /> All Absent
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {students.map((s, i) => {
                      const status = attendance[s.user_id] || "present";
                      const config = statusConfig[status];
                      return (
                        <div key={s.id} className={`flex items-center gap-3 p-3 rounded-lg border-l-4 ${config.border} ${config.bg} transition-all`}>
                          <span className="w-8 text-sm text-muted-foreground font-mono">{i + 1}.</span>
                          <span className="flex-1 font-medium text-foreground">{s.profiles?.full_name || "Student"}</span>
                          <div className="flex gap-1">
                            {(["present", "absent", "late", "excused"] as const).map(st => {
                              const cfg = statusConfig[st];
                              const Icon = cfg.icon;
                              return (
                                <button key={st} onClick={() => setAttendance(prev => ({ ...prev, [s.user_id]: st }))}
                                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1 ${
                                    status === st ? `${cfg.bg} ${cfg.text} ${cfg.border}` : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                                  }`}>
                                  <Icon className="w-3 h-3" />
                                  {st.charAt(0).toUpperCase() + st.slice(1)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherAttendance;

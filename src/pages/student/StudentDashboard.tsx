import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ClipboardCheck, Bell, DollarSign, TrendingUp } from "lucide-react";

const StudentDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ subjects: 0, avgMark: 0, attendance: 0 });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [recentGrades, setRecentGrades] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [gradesRes, attRes, annRes] = await Promise.all([
        supabase.from("grades").select("*, subjects(name)").eq("student_id", user.id).order("created_at", { ascending: false }),
        supabase.from("attendance").select("status").eq("student_id", user.id),
        supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(5),
      ]);

      const grades = gradesRes.data || [];
      const att = attRes.data || [];
      const presentCount = att.filter(a => a.status === "present").length;

      setStats({
        subjects: new Set(grades.map(g => g.subject_id)).size,
        avgMark: grades.length ? Math.round(grades.reduce((sum, g) => sum + Number(g.mark), 0) / grades.length) : 0,
        attendance: att.length ? Math.round((presentCount / att.length) * 100) : 0,
      });
      setRecentGrades(grades.slice(0, 6));
      setAnnouncements(annRes.data || []);
    };
    fetch();
  }, [user]);

  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Student Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your academic overview.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-lg bg-muted text-primary"><BookOpen className="w-6 h-6" /></div>
              <div><p className="text-2xl font-bold">{stats.subjects}</p><p className="text-sm text-muted-foreground">Subjects</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-lg bg-muted text-secondary"><TrendingUp className="w-6 h-6" /></div>
              <div><p className="text-2xl font-bold">{stats.avgMark}%</p><p className="text-sm text-muted-foreground">Average Mark</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-lg bg-muted text-accent"><ClipboardCheck className="w-6 h-6" /></div>
              <div><p className="text-2xl font-bold">{stats.attendance}%</p><p className="text-sm text-muted-foreground">Attendance</p></div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Recent Grades</CardTitle></CardHeader>
            <CardContent>
              {recentGrades.length === 0 ? (
                <p className="text-muted-foreground text-sm">No grades yet.</p>
              ) : (
                <div className="space-y-2">
                  {recentGrades.map(g => (
                    <div key={g.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <span className="font-medium">{g.subjects?.name}</span>
                      <span className="font-bold text-primary">{g.mark}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Bell className="w-5 h-5" /> Announcements</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {announcements.length === 0 ? (
                <p className="text-muted-foreground text-sm">No announcements.</p>
              ) : (
                announcements.map(a => (
                  <div key={a.id} className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDashboard;

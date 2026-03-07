import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, ClipboardCheck, Bell, FileText, TrendingUp, GraduationCap, BarChart3, Clock, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#f59e0b", "#10b981"];

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ classes: 0, students: 0, announcements: 0, subjects: 0 });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<any[]>([]);
  const [gradeDistribution, setGradeDistribution] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [assignmentsRes, announcementsRes, activityRes] = await Promise.all([
        supabase.from("teacher_assignments").select("id, class_id, subject_id").eq("teacher_id", user.id),
        supabase.from("announcements").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(5),
        supabase.from("activity_log").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
      ]);

      const classIds = [...new Set(assignmentsRes.data?.map(a => a.class_id) || [])];
      const subjectIds = [...new Set(assignmentsRes.data?.map(a => a.subject_id) || [])];
      let studentCount = 0;
      if (classIds.length > 0) {
        const { count } = await supabase.from("student_profiles").select("id", { count: "exact", head: true }).in("class_id", classIds).eq("is_active", true);
        studentCount = count || 0;
      }

      setStats({ classes: classIds.length, students: studentCount, announcements: announcementsRes.data?.length || 0, subjects: subjectIds.length });
      setAnnouncements(announcementsRes.data || []);
      setActivityLog(activityRes.data || []);

      // Attendance stats for last 7 days
      if (classIds.length > 0) {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { data: attData } = await supabase.from("attendance").select("status, date")
          .in("class_id", classIds).gte("date", weekAgo.toISOString().split("T")[0]);
        
        const statusMap: Record<string, number> = { present: 0, absent: 0, late: 0, excused: 0 };
        (attData || []).forEach(a => { statusMap[a.status] = (statusMap[a.status] || 0) + 1; });
        setAttendanceStats(Object.entries(statusMap).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value })));
      }

      // Grade distribution
      const { data: gradesData } = await supabase.from("grades").select("mark").eq("teacher_id", user.id).is("deleted_at", null);
      if (gradesData && gradesData.length > 0) {
        const ranges = [
          { name: "A (75-100)", min: 75, max: 100, count: 0 },
          { name: "B (60-74)", min: 60, max: 74, count: 0 },
          { name: "C (50-59)", min: 50, max: 59, count: 0 },
          { name: "D (40-49)", min: 40, max: 49, count: 0 },
          { name: "F (<40)", min: 0, max: 39, count: 0 },
        ];
        gradesData.forEach(g => {
          const r = ranges.find(r => g.mark >= r.min && g.mark <= r.max);
          if (r) r.count++;
        });
        setGradeDistribution(ranges.filter(r => r.count > 0));
      }
    };
    fetchData();
  }, [user]);

  const statCards = [
    { label: "My Classes", value: stats.classes, icon: BookOpen, color: "text-primary", link: "/teacher/classes" },
    { label: "Subjects", value: stats.subjects, icon: GraduationCap, color: "text-accent", link: "/teacher/grades" },
    { label: "Total Students", value: stats.students, icon: Users, color: "text-secondary", link: "/teacher/classes" },
    { label: "Announcements", value: stats.announcements, icon: Bell, color: "text-primary", link: "/teacher/announcements" },
  ];

  const quickActions = [
    { label: "Mark Attendance", path: "/teacher/attendance", icon: ClipboardCheck, desc: "Record daily attendance" },
    { label: "Enter Grades", path: "/teacher/grades", icon: BookOpen, desc: "Set term grades" },
    { label: "Monthly Tests", path: "/teacher/monthly-tests", icon: BarChart3, desc: "Record test marks" },
    { label: "Generate Reports", path: "/teacher/reports", icon: FileText, desc: "Print report cards" },
    { label: "Class Lists", path: "/teacher/classes", icon: Users, desc: "View & download lists" },
    { label: "Announcements", path: "/teacher/announcements", icon: Bell, desc: "Post class updates" },
  ];

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your overview.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Link key={stat.label} to={stat.link}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardCheck className="w-5 h-5" /> Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.path}
                  to={action.path}
                  className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors border border-transparent hover:border-border"
                >
                  <action.icon className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <p className="font-medium text-foreground text-sm">{action.label}</p>
                    <p className="text-xs text-muted-foreground">{action.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardCheck className="w-5 h-5" /> Attendance This Week
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              {attendanceStats.some(s => s.value > 0) ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={attendanceStats} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {attendanceStats.map((_, i) => (
                        <Cell key={i} fill={["#10b981", "#ef4444", "#f59e0b", "#3b82f6"][i] || COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm py-10">No attendance data this week</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5" /> Grade Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {gradeDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={gradeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Students" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm py-10">No grades entered yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Log & Announcements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5" /> Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[350px] overflow-y-auto">
              {activityLog.length === 0 ? (
                <p className="text-muted-foreground text-sm">No recent activity.</p>
              ) : activityLog.map(a => (
                <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/40">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.action}</p>
                    {a.details && <p className="text-xs text-muted-foreground truncate">{a.details}</p>}
                    <p className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="w-5 h-5" /> Recent Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[350px] overflow-y-auto">
              {announcements.length === 0 ? (
                <p className="text-muted-foreground text-sm">No announcements yet.</p>
              ) : announcements.map((a) => (
                <div key={a.id} className="p-3 rounded-lg bg-muted/50 border-l-4 border-primary">
                  <p className="font-medium text-foreground text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherDashboard;

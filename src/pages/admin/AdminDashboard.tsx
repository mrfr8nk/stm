import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, BookOpen, Key, Bell, DollarSign, FileText, Calendar, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#8b5cf6"];

const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, teachers: 0, students: 0, classes: 0, subjects: 0, codes: 0, pendingApps: 0, announcements: 0 });
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);
  const [enrollmentByYear, setEnrollmentByYear] = useState<any[]>([]);
  const [levelDistribution, setLevelDistribution] = useState<any[]>([]);
  const [formDistribution, setFormDistribution] = useState<any[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const [profiles, teachers, students, classes, subjects, codes, apps, annRes, sessionRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("classes").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("subjects").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("access_codes").select("id", { count: "exact", head: true }).eq("used", false),
        supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("announcements").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(5),
        supabase.from("academic_sessions").select("*").eq("is_current", true).maybeSingle(),
      ]);
      setStats({
        users: profiles.count || 0, teachers: teachers.count || 0, students: students.count || 0,
        classes: classes.count || 0, subjects: subjects.count || 0, codes: codes.count || 0,
        pendingApps: apps.count || 0, announcements: (annRes.data || []).length,
      });
      setRecentAnnouncements(annRes.data || []);
      setCurrentSession(sessionRes.data);

      // Enrollment analytics
      const { data: studentProfiles } = await supabase.from("student_profiles").select("enrollment_date, level, form, is_active");
      if (studentProfiles) {
        // Year-by-year enrollment
        const yearMap: Record<number, number> = {};
        const currentYear = new Date().getFullYear();
        for (let y = currentYear - 5; y <= currentYear; y++) yearMap[y] = 0;
        studentProfiles.forEach(s => {
          const year = s.enrollment_date ? new Date(s.enrollment_date).getFullYear() : currentYear;
          if (yearMap[year] !== undefined) yearMap[year]++;
        });
        setEnrollmentByYear(Object.entries(yearMap).map(([year, count]) => ({ year, count })));

        // Level distribution
        const levelMap: Record<string, number> = { zjc: 0, o_level: 0, a_level: 0 };
        const formMap: Record<number, number> = {};
        studentProfiles.filter(s => s.is_active).forEach(s => {
          levelMap[s.level] = (levelMap[s.level] || 0) + 1;
          formMap[s.form] = (formMap[s.form] || 0) + 1;
        });
        setLevelDistribution([
          { name: "ZJC", value: levelMap.zjc },
          { name: "O Level", value: levelMap.o_level },
          { name: "A Level", value: levelMap.a_level },
        ].filter(d => d.value > 0));
        setFormDistribution(Object.entries(formMap).sort(([a], [b]) => Number(a) - Number(b)).map(([form, count]) => ({ form: `Form ${form}`, count })));
      }
    };
    fetchAll();
  }, []);

  const cards = [
    { label: "Total Users", value: stats.users, icon: Users, color: "text-primary", link: "/admin/users" },
    { label: "Teachers", value: stats.teachers, icon: Users, color: "text-secondary", link: "/admin/users" },
    { label: "Students", value: stats.students, icon: GraduationCap, color: "text-accent", link: "/admin/users" },
    { label: "Classes", value: stats.classes, icon: GraduationCap, color: "text-primary", link: "/admin/classes" },
    { label: "Subjects", value: stats.subjects, icon: BookOpen, color: "text-secondary", link: "/admin/subjects" },
    { label: "Active Codes", value: stats.codes, icon: Key, color: "text-accent", link: "/admin/codes" },
    { label: "Pending Apps", value: stats.pendingApps, icon: FileText, color: "text-yellow-600", link: "/admin/applications" },
    { label: "Announcements", value: stats.announcements, icon: Bell, color: "text-primary", link: "/admin/announcements" },
  ];

  const termLabel = (t: string) => t?.replace("_", " ").toUpperCase() || "";

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">School management overview</p>
          </div>
          {currentSession && (
            <Card>
              <CardContent className="flex items-center gap-3 p-3">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-bold">{currentSession.academic_year} — {termLabel(currentSession.term)}</p>
                  <p className="text-xs text-muted-foreground">{currentSession.start_date} to {currentSession.end_date}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map(c => (
            <Link key={c.label} to={c.link}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`p-3 rounded-lg bg-muted ${c.color}`}><c.icon className="w-5 h-5" /></div>
                  <div><p className="text-xl font-bold">{c.value}</p><p className="text-xs text-muted-foreground">{c.label}</p></div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Enrollment Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5" /> Enrollment by Year
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={enrollmentByYear}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Students Enrolled" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="w-5 h-5" /> Students by Level
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              {levelDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={levelDistribution} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {levelDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm py-10">No student data yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5" /> Students by Form
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={formDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="form" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="hsl(var(--secondary))" radius={[6, 6, 0, 0]} name="Students" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Announcements */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Bell className="w-5 h-5" /> Recent Announcements</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {recentAnnouncements.length > 0 ? recentAnnouncements.map(a => (
                <div key={a.id} className="border-b border-border pb-3 last:border-0">
                  <p className="font-medium text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
                </div>
              )) : <p className="text-muted-foreground text-sm">No announcements yet</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;

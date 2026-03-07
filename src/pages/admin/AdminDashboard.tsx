import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, BookOpen, Key, Bell, BarChart3, DollarSign, FileText, Calendar } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, teachers: 0, students: 0, classes: 0, subjects: 0, codes: 0, pendingApps: 0, announcements: 0 });
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [recentAnnouncements, setRecentAnnouncements] = useState<any[]>([]);

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

        {/* Recent Announcements */}
        {recentAnnouncements.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" /> Recent Announcements</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {recentAnnouncements.map(a => (
                <div key={a.id} className="border-b border-border pb-3 last:border-0">
                  <p className="font-medium text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;

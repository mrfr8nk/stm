import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, ClipboardCheck, Bell, FileText, TrendingUp } from "lucide-react";

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ classes: 0, students: 0, announcements: 0 });
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const [assignmentsRes, announcementsRes] = await Promise.all([
        supabase.from("teacher_assignments").select("id, class_id").eq("teacher_id", user.id),
        supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(5),
      ]);

      const classIds = [...new Set(assignmentsRes.data?.map(a => a.class_id) || [])];
      let studentCount = 0;
      if (classIds.length > 0) {
        const { count } = await supabase.from("student_profiles").select("id", { count: "exact", head: true }).in("class_id", classIds);
        studentCount = count || 0;
      }

      setStats({ classes: classIds.length, students: studentCount, announcements: announcementsRes.data?.length || 0 });
      setAnnouncements(announcementsRes.data || []);
    };
    fetchData();
  }, [user]);

  const statCards = [
    { label: "My Classes", value: stats.classes, icon: BookOpen, color: "text-primary" },
    { label: "Total Students", value: stats.students, icon: Users, color: "text-secondary" },
    { label: "Announcements", value: stats.announcements, icon: Bell, color: "text-accent" },
  ];

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your overview.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardCheck className="w-5 h-5" /> Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Mark Attendance", path: "/teacher/attendance", icon: ClipboardCheck },
                { label: "Enter Grades", path: "/teacher/grades", icon: BookOpen },
                { label: "Generate Reports", path: "/teacher/reports", icon: FileText },
                { label: "View Class List", path: "/teacher/classes", icon: Users },
              ].map((action) => (
                <a
                  key={action.path}
                  href={action.path}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <action.icon className="w-5 h-5 text-primary" />
                  <span className="font-medium text-foreground">{action.label}</span>
                </a>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="w-5 h-5" /> Recent Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcements.length === 0 ? (
                <p className="text-muted-foreground text-sm">No announcements yet.</p>
              ) : (
                announcements.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg bg-muted/50">
                    <p className="font-medium text-foreground text-sm">{a.title}</p>
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

export default TeacherDashboard;

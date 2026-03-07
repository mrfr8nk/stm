import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, BookOpen, Key, Bell, BarChart3 } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ users: 0, teachers: 0, students: 0, classes: 0, subjects: 0, codes: 0 });

  useEffect(() => {
    const fetch = async () => {
      const [profiles, teachers, students, classes, subjects, codes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
        supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "student"),
        supabase.from("classes").select("id", { count: "exact", head: true }),
        supabase.from("subjects").select("id", { count: "exact", head: true }),
        supabase.from("access_codes").select("id", { count: "exact", head: true }).eq("used", false),
      ]);
      setStats({
        users: profiles.count || 0, teachers: teachers.count || 0, students: students.count || 0,
        classes: classes.count || 0, subjects: subjects.count || 0, codes: codes.count || 0,
      });
    };
    fetch();
  }, []);

  const cards = [
    { label: "Total Users", value: stats.users, icon: Users, color: "text-primary" },
    { label: "Teachers", value: stats.teachers, icon: Users, color: "text-secondary" },
    { label: "Students", value: stats.students, icon: GraduationCap, color: "text-accent" },
    { label: "Classes", value: stats.classes, icon: GraduationCap, color: "text-primary" },
    { label: "Subjects", value: stats.subjects, icon: BookOpen, color: "text-secondary" },
    { label: "Active Codes", value: stats.codes, icon: Key, color: "text-accent" },
  ];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">School management overview</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(c => (
            <Card key={c.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`p-3 rounded-lg bg-muted ${c.color}`}><c.icon className="w-6 h-6" /></div>
                <div><p className="text-2xl font-bold">{c.value}</p><p className="text-sm text-muted-foreground">{c.label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, ClipboardCheck, DollarSign, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

const ParentDashboard = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: links } = await supabase
        .from("parent_student_links")
        .select("student_id")
        .eq("parent_id", user.id);

      if (links && links.length > 0) {
        const studentIds = links.map(l => l.student_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", studentIds);
        const { data: studentProfiles } = await supabase
          .from("student_profiles")
          .select("*, classes(name)")
          .in("user_id", studentIds);

        const merged = studentIds.map(sid => ({
          profile: (profiles || []).find(p => p.user_id === sid),
          student: (studentProfiles || []).find(s => s.user_id === sid),
        }));
        setChildren(merged);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) return (
    <DashboardLayout role="parent">
      <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout role="parent">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Parent Dashboard</h1>
        <p className="text-sm text-muted-foreground">Monitor your child's academic progress</p>

        {children.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No children linked to your account yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Please contact the school administration to link your child's account.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {children.map((child, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      {child.profile?.avatar_url ? (
                        <img src={child.profile.avatar_url} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                          {(child.profile?.full_name || "S").charAt(0)}
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-lg">{child.profile?.full_name || "Student"}</CardTitle>
                        <p className="text-sm text-muted-foreground">{child.student?.classes?.name || `Form ${child.student?.form}`}</p>
                        {child.student?.student_id && <p className="text-xs text-muted-foreground">{child.student.student_id}</p>}
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Link to="/parent/grades">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10"><BookOpen className="w-6 h-6 text-primary" /></div>
                    <div>
                      <p className="font-bold">Grades</p>
                      <p className="text-sm text-muted-foreground">View academic performance</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/parent/attendance">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-green-500/10"><ClipboardCheck className="w-6 h-6 text-green-600" /></div>
                    <div>
                      <p className="font-bold">Attendance</p>
                      <p className="text-sm text-muted-foreground">Check attendance records</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/parent/fees">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-yellow-500/10"><DollarSign className="w-6 h-6 text-yellow-600" /></div>
                    <div>
                      <p className="font-bold">Fees</p>
                      <p className="text-sm text-muted-foreground">View fee balances</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ParentDashboard;

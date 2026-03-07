import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck } from "lucide-react";

const statusColors: Record<string, string> = {
  present: "bg-green-500/10 text-green-700",
  absent: "bg-destructive/10 text-destructive",
  late: "bg-yellow-500/10 text-yellow-700",
  excused: "bg-blue-500/10 text-blue-700",
};

const ParentAttendance = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<string[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: links } = await supabase.from("parent_student_links").select("student_id").eq("parent_id", user.id);
      const ids = (links || []).map(l => l.student_id);
      setChildren(ids);

      if (ids.length > 0) {
        const [a, p, c] = await Promise.all([
          supabase.from("attendance").select("*").in("student_id", ids).order("date", { ascending: false }).limit(100),
          supabase.from("profiles").select("*").in("user_id", ids),
          supabase.from("classes").select("*").is("deleted_at", null),
        ]);
        setAttendance(a.data || []);
        setProfiles(p.data || []);
        setClasses(c.data || []);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const getName = (uid: string) => profiles.find(p => p.user_id === uid)?.full_name || "Student";
  const getClassName = (id: string) => classes.find(c => c.id === id)?.name || "—";

  return (
    <DashboardLayout role="parent">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Children's Attendance</h1>

        {loading ? (
          <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : children.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No children linked.</CardContent></Card>
        ) : (
          children.map(childId => {
            const childAtt = attendance.filter(a => a.student_id === childId);
            const presentCount = childAtt.filter(a => a.status === "present").length;
            const rate = childAtt.length > 0 ? Math.round((presentCount / childAtt.length) * 100) : 0;

            return (
              <Card key={childId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2"><ClipboardCheck className="w-5 h-5" /> {getName(childId)}</CardTitle>
                    <Badge variant="outline" className="text-sm">{rate}% Attendance Rate</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead><TableHead>Class</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {childAtt.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No attendance records.</TableCell></TableRow>
                      ) : childAtt.slice(0, 30).map(a => (
                        <TableRow key={a.id}>
                          <TableCell>{new Date(a.date).toLocaleDateString()}</TableCell>
                          <TableCell>{getClassName(a.class_id)}</TableCell>
                          <TableCell><span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[a.status] || ""}`}>{a.status.toUpperCase()}</span></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{a.notes || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
};

export default ParentAttendance;

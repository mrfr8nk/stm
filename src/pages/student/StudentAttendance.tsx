import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ClipboardCheck, Check, X, Clock } from "lucide-react";

const StudentAttendance = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, late: 0 });

  useEffect(() => {
    if (!user) return;
    supabase.from("attendance").select("*").eq("student_id", user.id).order("date", { ascending: false })
      .then(({ data }) => {
        const d = data || [];
        setRecords(d);
        setStats({
          total: d.length,
          present: d.filter(r => r.status === "present").length,
          absent: d.filter(r => r.status === "absent").length,
          late: d.filter(r => r.status === "late").length,
        });
      });
  }, [user]);

  const pct = stats.total ? Math.round((stats.present / stats.total) * 100) : 0;
  const statusIcon: Record<string, React.ReactNode> = {
    present: <Check className="w-4 h-4 text-green-600" />,
    absent: <X className="w-4 h-4 text-red-600" />,
    late: <Clock className="w-4 h-4 text-yellow-600" />,
    excused: <Clock className="w-4 h-4 text-blue-600" />,
  };

  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">My Attendance</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total Days</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{stats.present}</p><p className="text-sm text-muted-foreground">Present</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{stats.absent}</p><p className="text-sm text-muted-foreground">Absent</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{stats.late}</p><p className="text-sm text-muted-foreground">Late</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Attendance Rate: {pct}%</CardTitle></CardHeader>
          <CardContent><Progress value={pct} className="h-3" /></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardCheck className="w-5 h-5" /> Attendance Records</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {records.slice(0, 30).map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.date).toLocaleDateString()}</TableCell>
                    <TableCell><span className="flex items-center gap-2">{statusIcon[r.status]} {r.status.charAt(0).toUpperCase() + r.status.slice(1)}</span></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.notes || "—"}</TableCell>
                  </TableRow>
                ))}
                {records.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No attendance records.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentAttendance;

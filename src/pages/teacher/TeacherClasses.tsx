import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Users, Search } from "lucide-react";

const TeacherClasses = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("teacher_assignments")
      .select("*, classes(*), subjects(*)")
      .eq("teacher_id", user.id)
      .then(({ data }) => setAssignments(data || []));
  }, [user]);

  useEffect(() => {
    if (!selectedClass) { setStudents([]); return; }
    supabase
      .from("student_profiles")
      .select("*, profiles!student_profiles_user_id_fkey(full_name, email)")
      .eq("class_id", selectedClass)
      .eq("is_active", true)
      .then(({ data }) => setStudents(data || []));
  }, [selectedClass]);

  const uniqueClasses = Array.from(new Map(assignments.map(a => [a.class_id, a.classes])).values()).filter(Boolean);

  const filteredStudents = students.filter(s =>
    (s.profiles?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.student_id || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">My Classes</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {uniqueClasses.map((cls: any) => (
            <Card
              key={cls.id}
              className={`cursor-pointer transition-all hover:shadow-card-hover ${selectedClass === cls.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => setSelectedClass(cls.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-bold text-foreground">{cls.name}</p>
                    <p className="text-sm text-muted-foreground">Form {cls.form} • {cls.stream || "Main"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {uniqueClasses.length === 0 && (
            <p className="text-muted-foreground col-span-3">No classes assigned yet. Contact administration.</p>
          )}
        </div>

        {selectedClass && (
          <Card>
            <CardHeader>
              <CardTitle>Student List</CardTitle>
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Form</TableHead>
                    <TableHead>Guardian</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((s, i) => (
                    <TableRow key={s.id}>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell className="font-medium">{s.profiles?.full_name || "—"}</TableCell>
                      <TableCell>{s.student_id || "—"}</TableCell>
                      <TableCell>Form {s.form}</TableCell>
                      <TableCell>{s.guardian_name || "—"}</TableCell>
                    </TableRow>
                  ))}
                  {filteredStudents.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No students found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherClasses;

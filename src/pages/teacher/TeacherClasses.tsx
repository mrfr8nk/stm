import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Search, Download, ArrowUpDown, Eye, Phone, Mail, Heart, Calendar, CreditCard } from "lucide-react";

type SortField = "name" | "student_id" | "form" | "guardian";
type SortDir = "asc" | "desc";

const TeacherClasses = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("teacher_assignments").select("*, classes(*), subjects(*)").eq("teacher_id", user.id)
      .then(({ data }) => setAssignments(data || []));
  }, [user]);

  useEffect(() => {
    if (!selectedClass) { setStudents([]); return; }
    supabase.from("student_profiles")
      .select("*, profiles!student_profiles_user_id_fkey(full_name, email, phone)")
      .eq("class_id", selectedClass).eq("is_active", true)
      .then(({ data }) => setStudents(data || []));
  }, [selectedClass]);

  const uniqueClasses = Array.from(new Map(assignments.map(a => [a.class_id, a.classes])).values()).filter(Boolean);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const filteredStudents = students
    .filter(s =>
      (s.profiles?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.student_id || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.guardian_name || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      let aVal = "", bVal = "";
      if (sortField === "name") { aVal = a.profiles?.full_name || ""; bVal = b.profiles?.full_name || ""; }
      else if (sortField === "student_id") { aVal = a.student_id || ""; bVal = b.student_id || ""; }
      else if (sortField === "form") { aVal = String(a.form); bVal = String(b.form); }
      else if (sortField === "guardian") { aVal = a.guardian_name || ""; bVal = b.guardian_name || ""; }
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

  const downloadCSV = () => {
    const headers = ["#", "Name", "Student ID", "Form", "Level", "DOB", "Guardian", "Guardian Phone", "Guardian Email"];
    const rows = filteredStudents.map((s, i) => [
      i + 1, s.profiles?.full_name || "", s.student_id || "", `Form ${s.form}`, s.level,
      s.date_of_birth || "", s.guardian_name || "", s.guardian_phone || "", s.guardian_email || ""
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    const cls = uniqueClasses.find(c => c.id === selectedClass);
    a.download = `class-list-${cls?.name || "students"}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const SortIcon = ({ field }: { field: SortField }) => (
    <ArrowUpDown className={`w-3 h-3 inline ml-1 cursor-pointer ${sortField === field ? "text-primary" : "text-muted-foreground"}`} onClick={() => toggleSort(field)} />
  );

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">My Classes</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {uniqueClasses.map((cls: any) => (
            <Card key={cls.id} className={`cursor-pointer transition-all hover:shadow-md ${selectedClass === cls.id ? "ring-2 ring-primary" : ""}`} onClick={() => setSelectedClass(cls.id)}>
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
          {uniqueClasses.length === 0 && <p className="text-muted-foreground col-span-3">No classes assigned yet. Contact administration.</p>}
        </div>

        {selectedClass && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" /> Student List ({filteredStudents.length})
              </CardTitle>
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-56" />
                </div>
                <Button variant="outline" size="sm" onClick={downloadCSV}>
                  <Download className="w-4 h-4 mr-1" /> CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("name")}>Name <SortIcon field="name" /></TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("student_id")}>Student ID <SortIcon field="student_id" /></TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>DOB</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("guardian")}>Guardian <SortIcon field="guardian" /></TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((s, i) => (
                    <TableRow key={s.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{s.profiles?.full_name || "—"}</TableCell>
                      <TableCell><Badge variant="outline">{s.student_id || "—"}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{s.level?.replace("_", " ").toUpperCase()}</Badge></TableCell>
                      <TableCell className="text-sm">{s.date_of_birth || "—"}</TableCell>
                      <TableCell className="text-sm">{s.guardian_name || "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(s)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredStudents.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No students found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Student Detail Dialog */}
        <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" /> Student Records
              </DialogTitle>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                    {(selectedStudent.profiles?.full_name || "S").charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{selectedStudent.profiles?.full_name || "—"}</p>
                    <Badge>{selectedStudent.level?.replace("_", " ").toUpperCase()}</Badge>
                    <Badge variant="outline" className="ml-2">Form {selectedStudent.form}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <DetailItem icon={CreditCard} label="Student ID" value={selectedStudent.student_id} />
                  <DetailItem icon={Calendar} label="Date of Birth" value={selectedStudent.date_of_birth} />
                  <DetailItem icon={CreditCard} label="National ID" value={selectedStudent.national_id} />
                  <DetailItem icon={CreditCard} label="Birth Cert #" value={selectedStudent.birth_cert_number} />
                  <DetailItem icon={Mail} label="Email" value={selectedStudent.profiles?.email} />
                  <DetailItem icon={Phone} label="Phone" value={selectedStudent.profiles?.phone} />
                </div>

                <div className="border-t border-border pt-3 mt-3">
                  <p className="text-sm font-bold text-foreground mb-2">Guardian Information</p>
                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem icon={Users} label="Guardian" value={selectedStudent.guardian_name} />
                    <DetailItem icon={Phone} label="Guardian Phone" value={selectedStudent.guardian_phone} />
                    <DetailItem icon={Mail} label="Guardian Email" value={selectedStudent.guardian_email} />
                    <DetailItem icon={Phone} label="Emergency" value={selectedStudent.emergency_contact} />
                  </div>
                </div>

                <div className="border-t border-border pt-3 mt-3">
                  <p className="text-sm font-bold text-foreground mb-2">Medical Information</p>
                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem icon={Heart} label="Blood Type" value={selectedStudent.blood_type} />
                    <DetailItem icon={Heart} label="Allergies" value={selectedStudent.allergies} />
                  </div>
                  {selectedStudent.medical_conditions && (
                    <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/30">
                      <p className="text-xs font-medium text-red-700">Medical Conditions</p>
                      <p className="text-sm">{selectedStudent.medical_conditions}</p>
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground">
                  Enrolled: {selectedStudent.enrollment_date || "—"} • Address: {selectedStudent.address || "—"}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

const DetailItem = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) => (
  <div className="flex items-start gap-2">
    <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  </div>
);

export default TeacherClasses;

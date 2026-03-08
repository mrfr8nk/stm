import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Search, Download, ArrowUpDown, Eye, Phone, Mail,
  Heart, Calendar, CreditCard, BookOpen, ClipboardCheck, MapPin,
  AlertTriangle, Droplets, Shield, Edit, Save, Star
} from "lucide-react";

type SortField = "name" | "student_id" | "form" | "guardian";
type SortDir = "asc" | "desc";

const TeacherClasses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentGrades, setStudentGrades] = useState<any[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<any[]>([]);
  const [studentFees, setStudentFees] = useState<any[]>([]);
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [classTeacherClassIds, setClassTeacherClassIds] = useState<Set<string>>(new Set());
  const [classTeacherClasses, setClassTeacherClasses] = useState<any[]>([]);
  const [editingGrade, setEditingGrade] = useState<any>(null);
  const [editMark, setEditMark] = useState("");
  const [editComment, setEditComment] = useState("");

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("teacher_assignments").select("*, classes(*), subjects(*)").eq("teacher_id", user.id),
      supabase.from("classes").select("*").eq("class_teacher_id", user.id).is("deleted_at", null),
    ]).then(([assignRes, ctRes]) => {
      setAssignments(assignRes.data || []);
      setClassTeacherClasses(ctRes.data || []);
      setClassTeacherClassIds(new Set((ctRes.data || []).map((c: any) => c.id)));
    });
  }, [user]);

  useEffect(() => {
    if (!selectedClass) { setStudents([]); return; }
    const fetchStudents = async () => {
      const { data: spData } = await supabase.from("student_profiles")
        .select("*").eq("class_id", selectedClass).eq("is_active", true);
      if (!spData || spData.length === 0) { setStudents([]); return; }
      const userIds = spData.map(s => s.user_id);
      const { data: profilesData } = await supabase.from("profiles")
        .select("user_id, full_name, email, phone").in("user_id", userIds);
      const profileMap: Record<string, any> = {};
      (profilesData || []).forEach(p => { profileMap[p.user_id] = p; });
      setStudents(spData.map(s => ({ ...s, profiles: profileMap[s.user_id] || null })));
    };
    fetchStudents();

    // Get subjects taught in this class
    const subs = assignments.filter(a => a.class_id === selectedClass).map(a => a.subjects).filter(Boolean);
    setClassSubjects(subs);
  }, [selectedClass, assignments]);

  const assignmentClassMap = new Map(assignments.map(a => [a.class_id, a.classes]));
  classTeacherClasses.forEach(c => { if (!assignmentClassMap.has(c.id)) assignmentClassMap.set(c.id, c); });
  const uniqueClasses = Array.from(assignmentClassMap.values()).filter(Boolean);

  const isClassTeacherOf = (classId: string) => classTeacherClassIds.has(classId);

  const handleEditGradeSave = async () => {
    if (!editingGrade) return;
    const { error } = await supabase.from("grades").update({
      mark: parseFloat(editMark),
      comment: editComment || null,
    }).eq("id", editingGrade.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Grade Updated" });
      setEditingGrade(null);
      if (selectedStudent) openStudentDetail(selectedStudent);
    }
  };

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

  const openStudentDetail = async (student: any) => {
    setSelectedStudent(student);
    // Fetch student's grades, attendance, fees in parallel
    const [gradesRes, attRes, feesRes] = await Promise.all([
      supabase.from("grades").select("*, subjects(name)").eq("student_id", student.user_id).is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("attendance").select("*").eq("student_id", student.user_id).order("date", { ascending: false }).limit(30),
      supabase.from("fee_records").select("*").eq("student_id", student.user_id).is("deleted_at", null).order("created_at", { ascending: false }),
    ]);
    setStudentGrades(gradesRes.data || []);
    setStudentAttendance(attRes.data || []);
    setStudentFees(feesRes.data || []);
  };

  const downloadCSV = () => {
    const headers = ["#", "Name", "Student ID", "Form", "Level", "DOB", "National ID", "Birth Cert", "Guardian", "Guardian Phone", "Guardian Email", "Blood Type", "Allergies", "Medical Conditions", "Address"];
    const rows = filteredStudents.map((s, i) => [
      i + 1, s.profiles?.full_name || "", s.student_id || "", `Form ${s.form}`, s.level,
      s.date_of_birth || "", s.national_id || "", s.birth_cert_number || "",
      s.guardian_name || "", s.guardian_phone || "", s.guardian_email || "",
      s.blood_type || "", s.allergies || "", s.medical_conditions || "", s.address || ""
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

  const selectedClassObj = uniqueClasses.find(c => c.id === selectedClass);

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">My Classes</h1>
          <p className="text-sm text-muted-foreground">View assigned classes and student records</p>
        </div>

        {/* Class Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {uniqueClasses.map((cls: any) => {
            const subjectsInClass = assignments.filter(a => a.class_id === cls.id).map(a => a.subjects?.name).filter(Boolean);
            const isCT = isClassTeacherOf(cls.id);
            return (
              <Card key={cls.id} className={`cursor-pointer transition-all hover:shadow-md ${selectedClass === cls.id ? "ring-2 ring-primary bg-primary/5" : ""}`} onClick={() => setSelectedClass(cls.id)}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${isCT ? "bg-amber-100 dark:bg-amber-900/20" : "bg-primary/10"}`}>
                      {isCT ? <Star className="w-6 h-6 text-amber-600" /> : <Users className="w-6 h-6 text-primary" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground">{cls.name}</p>
                        {isCT && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px]">Class Teacher</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">Form {cls.form} • {cls.stream || "Main"}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {cls.level?.replace("_", " ").toUpperCase()}
                      </p>
                    </div>
                  </div>
                  {isCT && subjectsInClass.length === 0 && (
                    <p className="text-xs text-amber-600 mt-2">All subjects — Class Teacher access</p>
                  )}
                  {subjectsInClass.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {subjectsInClass.map(s => (
                        <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                      ))}
                      {isCT && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-400">+ All Subjects</Badge>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {uniqueClasses.length === 0 && (
            <p className="text-muted-foreground col-span-3">No classes assigned yet. Contact administration.</p>
          )}
        </div>

        {/* Student List */}
        {selectedClass && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" /> {selectedClassObj?.name} — Student List ({filteredStudents.length})
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {classSubjects.map(s => s.name).join(", ")}
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-56" />
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
                    <TableHead>Medical</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((s, i) => (
                    <TableRow key={s.id} className="hover:bg-muted/50">
                      <TableCell className="text-muted-foreground font-mono">{i + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {(s.profiles?.full_name || "S").charAt(0)}
                          </div>
                          <span className="font-medium">{s.profiles?.full_name || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="font-mono">{s.student_id || "—"}</Badge></TableCell>
                      <TableCell><Badge variant="secondary">{s.level?.replace("_", " ").toUpperCase()}</Badge></TableCell>
                      <TableCell className="text-sm">{s.date_of_birth || "—"}</TableCell>
                      <TableCell className="text-sm">{s.guardian_name || "—"}</TableCell>
                      <TableCell>
                        {(s.allergies || s.medical_conditions) ? (
                          <Badge variant="destructive" className="text-[10px]">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Alert
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">None</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openStudentDetail(s)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredStudents.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">No students found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Student Detail Dialog */}
        <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> Student Records
              </DialogTitle>
            </DialogHeader>
            {selectedStudent && (
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="personal">Personal</TabsTrigger>
                  <TabsTrigger value="academic">Academic</TabsTrigger>
                  <TabsTrigger value="attendance">Attendance</TabsTrigger>
                  <TabsTrigger value="medical">Medical</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="space-y-4 mt-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                      {(selectedStudent.profiles?.full_name || "S").charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{selectedStudent.profiles?.full_name || "—"}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge>{selectedStudent.level?.replace("_", " ").toUpperCase()}</Badge>
                        <Badge variant="outline">Form {selectedStudent.form}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem icon={CreditCard} label="Student ID" value={selectedStudent.student_id} />
                    <DetailItem icon={Calendar} label="Date of Birth" value={selectedStudent.date_of_birth} />
                    <DetailItem icon={CreditCard} label="National ID" value={selectedStudent.national_id} />
                    <DetailItem icon={CreditCard} label="Birth Cert #" value={selectedStudent.birth_cert_number} />
                    <DetailItem icon={Mail} label="Email" value={selectedStudent.profiles?.email} />
                    <DetailItem icon={Phone} label="Phone" value={selectedStudent.profiles?.phone} />
                    <DetailItem icon={MapPin} label="Address" value={selectedStudent.address} />
                    <DetailItem icon={Calendar} label="Enrolled" value={selectedStudent.enrollment_date} />
                  </div>

                  <div className="border-t border-border pt-3">
                    <p className="text-sm font-bold text-foreground mb-2">Guardian Information</p>
                    <div className="grid grid-cols-2 gap-3">
                      <DetailItem icon={Users} label="Guardian Name" value={selectedStudent.guardian_name} />
                      <DetailItem icon={Phone} label="Guardian Phone" value={selectedStudent.guardian_phone} />
                      <DetailItem icon={Mail} label="Guardian Email" value={selectedStudent.guardian_email} />
                      <DetailItem icon={Phone} label="Emergency Contact" value={selectedStudent.emergency_contact} />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="academic" className="space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground">All Grades ({studentGrades.length})</p>
                    {selectedClass && isClassTeacherOf(selectedClass) && (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px]">
                        <Star className="w-3 h-3 mr-1" /> Class Teacher — Can Edit
                      </Badge>
                    )}
                  </div>
                  {studentGrades.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4">No grades recorded.</p>
                  ) : (
                    <div className="space-y-1">
                      {studentGrades.slice(0, 30).map(g => (
                        <div key={g.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <span className="text-sm font-medium">{g.subjects?.name || "Subject"}</span>
                          <div className="flex items-center gap-2">
                            {editingGrade?.id === g.id ? (
                              <>
                                <Input type="number" min={0} max={100} className="w-20 h-7 text-sm"
                                  value={editMark} onChange={e => setEditMark(e.target.value)} />
                                <Input placeholder="Comment" className="w-32 h-7 text-sm"
                                  value={editComment} onChange={e => setEditComment(e.target.value)} />
                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleEditGradeSave}>
                                  <Save className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingGrade(null)}>✕</Button>
                              </>
                            ) : (
                              <>
                                <span className={`text-sm font-bold ${Number(g.mark) >= 75 ? "text-green-600" : Number(g.mark) >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                                  {g.mark}%
                                </span>
                                <Badge variant="outline" className="text-[10px]">{g.grade_letter || "—"}</Badge>
                                <span className="text-xs text-muted-foreground">{g.term?.replace("_", " ")}</span>
                                {selectedClass && isClassTeacherOf(selectedClass) && (
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => {
                                    setEditingGrade(g);
                                    setEditMark(g.mark.toString());
                                    setEditComment(g.comment || "");
                                  }}>
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="attendance" className="space-y-3 mt-4">
                  <p className="text-sm font-bold text-foreground">Recent Attendance ({studentAttendance.length})</p>
                  {studentAttendance.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4">No attendance records.</p>
                  ) : (
                    <div className="space-y-1">
                      {studentAttendance.map(a => {
                        const colors: Record<string, string> = {
                          present: "bg-green-500/15 text-green-700 border-green-500",
                          absent: "bg-red-500/15 text-red-700 border-red-500",
                          late: "bg-yellow-500/15 text-yellow-700 border-yellow-500",
                          excused: "bg-blue-500/15 text-blue-700 border-blue-500"
                        };
                        return (
                          <div key={a.id} className={`flex items-center justify-between p-2 rounded border-l-4 ${colors[a.status] || ""}`}>
                            <span className="text-sm">{a.date}</span>
                            <Badge variant="outline" className="text-xs capitalize">{a.status}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="medical" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <DetailItem icon={Droplets} label="Blood Type" value={selectedStudent.blood_type} />
                    <DetailItem icon={Heart} label="Allergies" value={selectedStudent.allergies} />
                  </div>
                  {selectedStudent.medical_conditions && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <p className="text-sm font-bold text-red-700">Medical Conditions</p>
                      </div>
                      <p className="text-sm">{selectedStudent.medical_conditions}</p>
                    </div>
                  )}
                  {!selectedStudent.allergies && !selectedStudent.medical_conditions && !selectedStudent.blood_type && (
                    <p className="text-muted-foreground text-sm py-4">No medical information on file.</p>
                  )}
                  <div className="border-t border-border pt-3">
                    <p className="text-sm font-bold text-foreground mb-2">Emergency Contact</p>
                    <div className="grid grid-cols-2 gap-3">
                      <DetailItem icon={Phone} label="Emergency Contact" value={selectedStudent.emergency_contact} />
                      <DetailItem icon={Phone} label="Emergency Phone" value={selectedStudent.emergency_phone} />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
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

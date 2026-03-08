import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, Plus, Trash2, Eye, BookOpen, GraduationCap, Briefcase, UserCheck } from "lucide-react";

interface Teacher {
  user_id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  // teacher_profile fields
  employee_id: string | null;
  department: string | null;
  qualification: string | null;
  date_joined: string | null;
  subjects_taught: string[] | null;
}

interface Assignment {
  id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
  academic_year: number;
}

interface ClassInfo {
  id: string;
  name: string;
  form: number;
  level: string;
  class_teacher_id: string | null;
}

interface SubjectInfo {
  id: string;
  name: string;
  code: string | null;
  level: string | null;
}

const AdminStaffManagement = () => {
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Detail dialog
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Assignment form
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTeacherId, setAssignTeacherId] = useState("");
  const [assignClassId, setAssignClassId] = useState("");
  const [assignSubjectId, setAssignSubjectId] = useState("");
  const [assignType, setAssignType] = useState<"subject" | "class_teacher">("subject");

  // Edit teacher profile
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ employee_id: "", department: "", qualification: "", date_joined: "" });

  const currentYear = new Date().getFullYear();

  const fetchData = async () => {
    setLoading(true);
    const [rolesRes, profilesRes, tpRes, assignRes, classRes, subRes] = await Promise.all([
      supabase.from("user_roles").select("user_id").eq("role", "teacher"),
      supabase.from("profiles").select("user_id, full_name, email, avatar_url, phone"),
      supabase.from("teacher_profiles").select("*"),
      supabase.from("teacher_assignments").select("*").eq("academic_year", currentYear),
      supabase.from("classes").select("*").is("deleted_at", null).order("form").order("name"),
      supabase.from("subjects").select("*").is("deleted_at", null).order("name"),
    ]);

    const teacherIds = new Set((rolesRes.data || []).map(r => r.user_id));
    const tpMap = new Map((tpRes.data || []).map((tp: any) => [tp.user_id, tp]));

    const teacherList: Teacher[] = (profilesRes.data || [])
      .filter(p => teacherIds.has(p.user_id))
      .map(p => {
        const tp = tpMap.get(p.user_id);
        return {
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          avatar_url: p.avatar_url,
          phone: p.phone,
          employee_id: tp?.employee_id || null,
          department: tp?.department || null,
          qualification: tp?.qualification || null,
          date_joined: tp?.date_joined || null,
          subjects_taught: tp?.subjects_taught || null,
        };
      })
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

    setTeachers(teacherList);
    setAssignments((assignRes.data || []) as Assignment[]);
    setClasses((classRes.data || []) as ClassInfo[]);
    setSubjects((subRes.data || []) as SubjectInfo[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getTeacherAssignments = (teacherId: string) =>
    assignments.filter(a => a.teacher_id === teacherId);

  const getTeacherClasses = (teacherId: string) => {
    const assignedClassIds = new Set(assignments.filter(a => a.teacher_id === teacherId).map(a => a.class_id));
    const classTeacherIds = new Set(classes.filter(c => c.class_teacher_id === teacherId).map(c => c.id));
    return [...new Set([...assignedClassIds, ...classTeacherIds])];
  };

  const getClassTeacherOf = (teacherId: string) =>
    classes.filter(c => c.class_teacher_id === teacherId);

  const getClassName = (id: string) => classes.find(c => c.id === id)?.name || "Unknown";
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || "Unknown";

  const handleAssign = async () => {
    if (!assignTeacherId || !assignClassId) return;

    if (assignType === "class_teacher") {
      const { error } = await supabase.from("classes").update({ class_teacher_id: assignTeacherId }).eq("id", assignClassId);
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
      toast({ title: "Class Teacher Assigned", description: `${teachers.find(t => t.user_id === assignTeacherId)?.full_name} → ${getClassName(assignClassId)}` });
    } else {
      if (!assignSubjectId) return toast({ title: "Select a subject", variant: "destructive" });
      // Check duplicate
      const exists = assignments.some(a => a.teacher_id === assignTeacherId && a.class_id === assignClassId && a.subject_id === assignSubjectId);
      if (exists) return toast({ title: "Already Assigned", variant: "destructive" });
      const { error } = await supabase.from("teacher_assignments").insert({
        teacher_id: assignTeacherId, class_id: assignClassId, subject_id: assignSubjectId, academic_year: currentYear,
      });
      if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
      toast({ title: "Subject Assigned", description: `${getSubjectName(assignSubjectId)} in ${getClassName(assignClassId)}` });
    }
    setAssignOpen(false);
    setAssignTeacherId("");
    setAssignClassId("");
    setAssignSubjectId("");
    fetchData();
  };

  const handleRemoveAssignment = async (id: string) => {
    if (!confirm("Remove this assignment?")) return;
    const { error } = await supabase.from("teacher_assignments").delete().eq("id", id);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Assignment Removed" });
    fetchData();
  };

  const handleRemoveClassTeacher = async (classId: string) => {
    if (!confirm("Remove class teacher assignment?")) return;
    const { error } = await supabase.from("classes").update({ class_teacher_id: null }).eq("id", classId);
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Class Teacher Removed" });
    fetchData();
  };

  const openDetail = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setDetailOpen(true);
  };

  const openEdit = (teacher: Teacher) => {
    setEditForm({
      employee_id: teacher.employee_id || "",
      department: teacher.department || "",
      qualification: teacher.qualification || "",
      date_joined: teacher.date_joined || "",
    });
    setSelectedTeacher(teacher);
    setEditOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!selectedTeacher) return;
    // Upsert teacher_profiles
    const { error } = await supabase.from("teacher_profiles").upsert({
      user_id: selectedTeacher.user_id,
      employee_id: editForm.employee_id || null,
      department: editForm.department || null,
      qualification: editForm.qualification || null,
      date_joined: editForm.date_joined || null,
    }, { onConflict: "user_id" });
    if (error) return toast({ title: "Error", description: error.message, variant: "destructive" });
    toast({ title: "Teacher Profile Updated" });
    setEditOpen(false);
    fetchData();
  };

  const openAssignFor = (teacherId: string) => {
    setAssignTeacherId(teacherId);
    setAssignType("subject");
    setAssignClassId("");
    setAssignSubjectId("");
    setAssignOpen(true);
  };

  const filtered = teachers.filter(t =>
    t.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (t.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (t.department || "").toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: teachers.length,
    withAssignments: teachers.filter(t => getTeacherAssignments(t.user_id).length > 0).length,
    classTeachers: classes.filter(c => c.class_teacher_id).length,
    unassigned: teachers.filter(t => getTeacherAssignments(t.user_id).length === 0 && getClassTeacherOf(t.user_id).length === 0).length,
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Staff Management</h1>
            <p className="text-muted-foreground">Manage teachers, assignments, and workload</p>
          </div>
          <Button onClick={() => { setAssignTeacherId(""); setAssignOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> New Assignment
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Users className="w-5 h-5 text-primary" /></div>
              <div><p className="text-2xl font-bold text-foreground">{stats.total}</p><p className="text-xs text-muted-foreground">Total Teachers</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><BookOpen className="w-5 h-5 text-green-600" /></div>
              <div><p className="text-2xl font-bold text-foreground">{stats.withAssignments}</p><p className="text-xs text-muted-foreground">With Subjects</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><GraduationCap className="w-5 h-5 text-blue-600" /></div>
              <div><p className="text-2xl font-bold text-foreground">{stats.classTeachers}</p><p className="text-xs text-muted-foreground">Class Teachers</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10"><Briefcase className="w-5 h-5 text-amber-600" /></div>
              <div><p className="text-2xl font-bold text-foreground">{stats.unassigned}</p><p className="text-xs text-muted-foreground">Unassigned</p></div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, email, department..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Teacher list */}
        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold">{search ? "No matching teachers" : "No teachers found"}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(teacher => {
              const teacherAssigns = getTeacherAssignments(teacher.user_id);
              const classTeacherOf = getClassTeacherOf(teacher.user_id);
              const uniqueClasses = getTeacherClasses(teacher.user_id);

              return (
                <Card key={teacher.user_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      {teacher.avatar_url ? (
                        <img src={teacher.avatar_url} alt={teacher.full_name} className="w-12 h-12 rounded-full object-cover border-2 border-border shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-bold shrink-0">
                          {teacher.full_name.charAt(0)}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{teacher.full_name}</h3>
                          {teacher.employee_id && <Badge variant="outline" className="text-xs">{teacher.employee_id}</Badge>}
                          {teacher.department && <Badge variant="secondary" className="text-xs">{teacher.department}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{teacher.email}</p>

                        {/* Assignments summary */}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {classTeacherOf.map(c => (
                            <Badge key={c.id} className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs">
                              <UserCheck className="w-3 h-3 mr-1" /> Class Teacher: {c.name}
                            </Badge>
                          ))}
                          {teacherAssigns.map(a => (
                            <Badge key={a.id} variant="outline" className="text-xs">
                              {getSubjectName(a.subject_id)} → {getClassName(a.class_id)}
                            </Badge>
                          ))}
                          {teacherAssigns.length === 0 && classTeacherOf.length === 0 && (
                            <span className="text-xs text-muted-foreground italic">No assignments yet</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => openAssignFor(teacher.user_id)}>
                          <Plus className="w-4 h-4 mr-1" /> Assign
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openDetail(teacher)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Assignment Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Teacher</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Teacher *</Label>
              <Select value={assignTeacherId} onValueChange={setAssignTeacherId}>
                <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                <SelectContent>
                  {teachers.map(t => (
                    <SelectItem key={t.user_id} value={t.user_id}>{t.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assignment Type</Label>
              <Select value={assignType} onValueChange={v => setAssignType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="subject">Subject Teacher (teaches a subject in a class)</SelectItem>
                  <SelectItem value="class_teacher">Class Teacher (responsible for a class)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Class *</Label>
              <Select value={assignClassId} onValueChange={setAssignClassId}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {assignType === "subject" && (
              <div>
                <Label>Subject *</Label>
                <Select value={assignSubjectId} onValueChange={setAssignSubjectId}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.code ? `(${s.code})` : ""} {s.level ? `— ${s.level.replace("_", " ")}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssign}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Teacher Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedTeacher && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {selectedTeacher.avatar_url ? (
                    <img src={selectedTeacher.avatar_url} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {selectedTeacher.full_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <span>{selectedTeacher.full_name}</span>
                    <p className="text-sm font-normal text-muted-foreground">{selectedTeacher.email}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="profile" className="mt-4">
                <TabsList className="w-full">
                  <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
                  <TabsTrigger value="assignments" className="flex-1">Assignments</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Employee ID</p>
                      <p className="text-sm font-medium">{selectedTeacher.employee_id || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Department</p>
                      <p className="text-sm font-medium">{selectedTeacher.department || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Qualification</p>
                      <p className="text-sm font-medium">{selectedTeacher.qualification || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date Joined</p>
                      <p className="text-sm font-medium">{selectedTeacher.date_joined ? new Date(selectedTeacher.date_joined).toLocaleDateString() : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium">{selectedTeacher.phone || "—"}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openEdit(selectedTeacher)}>
                    Edit Profile
                  </Button>
                </TabsContent>

                <TabsContent value="assignments" className="space-y-4 mt-4">
                  {/* Class Teacher */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <UserCheck className="w-4 h-4" /> Class Teacher Of
                    </h4>
                    {getClassTeacherOf(selectedTeacher.user_id).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Not assigned as class teacher</p>
                    ) : (
                      <div className="space-y-2">
                        {getClassTeacherOf(selectedTeacher.user_id).map(c => (
                          <div key={c.id} className="flex items-center justify-between p-2 rounded-lg border bg-blue-50 dark:bg-blue-900/10">
                            <div className="flex items-center gap-2">
                              <GraduationCap className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium">{c.name}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveClassTeacher(c.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Subject Assignments */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" /> Subject Assignments
                    </h4>
                    {getTeacherAssignments(selectedTeacher.user_id).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No subject assignments</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Subject</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getTeacherAssignments(selectedTeacher.user_id).map(a => (
                            <TableRow key={a.id}>
                              <TableCell className="font-medium">{getSubjectName(a.subject_id)}</TableCell>
                              <TableCell>{getClassName(a.class_id)}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveAssignment(a.id)}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  <Button variant="outline" size="sm" onClick={() => openAssignFor(selectedTeacher.user_id)}>
                    <Plus className="w-4 h-4 mr-1" /> Add Assignment
                  </Button>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Teacher Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Teacher Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee ID</Label>
              <Input value={editForm.employee_id} onChange={e => setEditForm({ ...editForm, employee_id: e.target.value })} placeholder="e.g. T001" />
            </div>
            <div>
              <Label>Department</Label>
              <Input value={editForm.department} onChange={e => setEditForm({ ...editForm, department: e.target.value })} placeholder="e.g. Sciences, Languages" />
            </div>
            <div>
              <Label>Qualification</Label>
              <Input value={editForm.qualification} onChange={e => setEditForm({ ...editForm, qualification: e.target.value })} placeholder="e.g. B.Ed, M.Sc" />
            </div>
            <div>
              <Label>Date Joined</Label>
              <Input type="date" value={editForm.date_joined} onChange={e => setEditForm({ ...editForm, date_joined: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveProfile}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AdminStaffManagement;

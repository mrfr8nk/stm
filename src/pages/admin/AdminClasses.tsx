import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Plus, Trash2, Edit, RotateCcw, Search, Info, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const ZJC_OLEVEL_STREAMS = ["G", "W", "E", "Z", "U", "A", "B"];
const ALEVEL_CLASSES = ["A", "B"];
const ALEVEL_STREAMS = ["Sciences", "Commercials", "Arts"];
const MAX_CLASSES_PER_TEACHER = 5;

const AdminClasses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<any[]>([]);
  const [deletedClasses, setDeletedClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [editClass, setEditClass] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);

  const [quickLevel, setQuickLevel] = useState("o_level");
  const [quickForm, setQuickForm] = useState("1");
  const [quickStream, setQuickStream] = useState("");
  const [customName, setCustomName] = useState("");

  // Assignment form
  const [assignTeacher, setAssignTeacher] = useState("");
  const [assignSubject, setAssignSubject] = useState("");
  const [assignClass, setAssignClass] = useState("");
  const [assignType, setAssignType] = useState<"subject" | "class_teacher">("subject");

  // Custom subject
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");

  const fetchData = async () => {
    const [classRes, profilesRes, rolesRes, assignRes, subRes] = await Promise.all([
      supabase.from("classes").select("*").order("form").order("name"),
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*").eq("role", "teacher"),
      supabase.from("teacher_assignments").select("*"),
      supabase.from("subjects").select("*").order("name"),
    ]);
    const all = classRes.data || [];
    setClasses(all.filter((c: any) => !c.deleted_at));
    setDeletedClasses(all.filter((c: any) => c.deleted_at));
    const teacherIds = new Set((rolesRes.data || []).map((r: any) => r.user_id));
    setTeachers((profilesRes.data || []).filter((p: any) => teacherIds.has(p.user_id)));
    setAssignments(assignRes.data || []);
    setSubjects(subRes.data || []);
  };

  useEffect(() => { fetchData(); }, []);

  const getAutoName = () => {
    if (customName.trim()) return customName.trim();
    const formNum = parseInt(quickForm);
    return `Form ${formNum}${quickStream ? ` ${quickStream}` : ""}`;
  };

  const handleAdd = async () => {
    const name = getAutoName();
    if (!name) return;
    const { error } = await supabase.from("classes").insert({
      name, form: parseInt(quickForm), level: quickLevel as any,
      stream: quickStream || null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Class Added", description: name }); setCustomName(""); setQuickStream(""); fetchData(); }
  };

  const handleQuickAdd = async (form: number, stream: string, level: string) => {
    const name = level === "a_level"
      ? `Form ${form} Class ${stream.split(" - ")[0]} ${stream.split(" - ")[1] || ""}`
      : `Form ${form} ${stream}`;
    const { error } = await supabase.from("classes").insert({
      name: name.trim(), form, level: level as any, stream: stream || null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Class Added", description: name }); fetchData(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this class?")) return;
    await supabase.from("classes").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
    toast({ title: "Class Deleted" }); fetchData();
  };

  const handleRestore = async (id: string) => {
    await supabase.from("classes").update({ deleted_at: null } as any).eq("id", id);
    toast({ title: "Class Restored" }); fetchData();
  };

  const handleEdit = async () => {
    if (!editClass) return;
    const { error } = await supabase.from("classes").update({
      name: editClass.name, form: editClass.form, level: editClass.level,
      stream: editClass.stream, class_teacher_id: editClass.class_teacher_id || null,
    }).eq("id", editClass.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Class Updated" }); setEditOpen(false); fetchData(); }
  };

  // Count how many classes a teacher is assigned to (unique class_ids)
  const getTeacherClassCount = (teacherId: string) => {
    const classIds = new Set(assignments.filter(a => a.teacher_id === teacherId).map(a => a.class_id));
    // Also count classes where they're class teacher
    classes.filter(c => c.class_teacher_id === teacherId).forEach(c => classIds.add(c.id));
    return classIds.size;
  };

  const handleAssign = async () => {
    if (!assignTeacher || !assignClass) return;

    if (assignType === "class_teacher") {
      // Assign as class teacher only
      const count = getTeacherClassCount(assignTeacher);
      if (count >= MAX_CLASSES_PER_TEACHER) {
        toast({ title: "Limit Reached", description: `This teacher already has ${count} classes (max ${MAX_CLASSES_PER_TEACHER}).`, variant: "destructive" });
        return;
      }
      const { error } = await supabase.from("classes").update({ class_teacher_id: assignTeacher }).eq("id", assignClass);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else { toast({ title: "Class Teacher Assigned" }); setAssignTeacher(""); setAssignClass(""); fetchData(); }
      return;
    }

    if (!assignSubject) return;
    const count = getTeacherClassCount(assignTeacher);
    // Check if this is a new class for the teacher
    const existingClassIds = new Set(assignments.filter(a => a.teacher_id === assignTeacher).map(a => a.class_id));
    classes.filter(c => c.class_teacher_id === assignTeacher).forEach(c => existingClassIds.add(c.id));
    if (!existingClassIds.has(assignClass) && existingClassIds.size >= MAX_CLASSES_PER_TEACHER) {
      toast({ title: "Limit Reached", description: `This teacher already has ${existingClassIds.size} classes (max ${MAX_CLASSES_PER_TEACHER}).`, variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("teacher_assignments").insert({
      teacher_id: assignTeacher, subject_id: assignSubject, class_id: assignClass,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Teacher Assigned" }); setAssignTeacher(""); setAssignSubject(""); setAssignClass(""); fetchData(); }
  };

  const handleRemoveAssignment = async (id: string) => {
    await supabase.from("teacher_assignments").delete().eq("id", id);
    toast({ title: "Assignment Removed" }); fetchData();
  };

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return;
    const { error } = await supabase.from("subjects").insert({
      name: newSubjectName.trim(), code: newSubjectCode.trim() || null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Subject Added", description: newSubjectName });
      setNewSubjectName(""); setNewSubjectCode(""); setShowAddSubject(false);
      fetchData();
    }
  };

  const getTeacherName = (id: string) => teachers.find(t => t.user_id === id)?.full_name || "—";
  const getClassName = (id: string) => classes.find(c => c.id === id)?.name || "—";
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || "—";

  const filteredClasses = classes.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const getStreamsForLevel = () => {
    if (quickLevel === "a_level") return ALEVEL_CLASSES;
    return ZJC_OLEVEL_STREAMS;
  };

  const getFormsForLevel = () => {
    if (quickLevel === "zjc") return [1, 2];
    if (quickLevel === "o_level") return [1, 2, 3, 4];
    return [5, 6];
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Class Management</h1>

        {/* Class Naming Guide */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Class Naming Convention</p>
                <p><strong>ZJC & O Level:</strong> Form 1-4 with streams G, W, E, Z, U, A (non-formal), B (non-formal) — e.g. <Badge variant="outline">Form 1 G</Badge> <Badge variant="outline">Form 3 W</Badge></p>
                <p className="mt-1"><strong>A Level:</strong> Form 5-6, Class A or B with specialization — e.g. <Badge variant="outline">Form 5 Class A Sciences</Badge></p>
                <p className="mt-1"><strong>Teacher Limit:</strong> Each teacher can be assigned to a maximum of <Badge variant="secondary">{MAX_CLASSES_PER_TEACHER} classes</Badge></p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add Class */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Add Class</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={quickLevel} onChange={e => { setQuickLevel(e.target.value); setQuickStream(""); setQuickForm(e.target.value === "a_level" ? "5" : "1"); }}>
                <option value="zjc">ZJC</option><option value="o_level">O Level</option><option value="a_level">A Level</option>
              </select>
              <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={quickForm} onChange={e => setQuickForm(e.target.value)}>
                {getFormsForLevel().map(f => <option key={f} value={f}>Form {f}</option>)}
              </select>
              <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={quickStream} onChange={e => setQuickStream(e.target.value)}>
                <option value="">Select Stream...</option>
                {quickLevel === "a_level" ? (
                  ALEVEL_CLASSES.flatMap(cls =>
                    ALEVEL_STREAMS.map(stream => (
                      <option key={`${cls}-${stream}`} value={`Class ${cls} ${stream}`}>Class {cls} — {stream}</option>
                    ))
                  )
                ) : (
                  getStreamsForLevel().map(s => <option key={s} value={s}>{s}{s === "A" || s === "B" ? " (non-formal)" : ""}</option>)
                )}
              </select>
              <Input placeholder="Custom name (optional)" value={customName} onChange={e => setCustomName(e.target.value)} className="w-48" />
              <Button onClick={handleAdd}><Plus className="w-4 h-4 mr-1" /> Add</Button>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-2">Quick Add — {quickLevel === "zjc" ? "ZJC" : quickLevel === "o_level" ? "O Level" : "A Level"} Form {quickForm}:</p>
              <div className="flex flex-wrap gap-2">
                {quickLevel === "a_level" ? (
                  ALEVEL_CLASSES.flatMap(cls =>
                    ALEVEL_STREAMS.map(stream => (
                      <Button key={`${cls}-${stream}`} variant="outline" size="sm"
                        onClick={() => handleQuickAdd(parseInt(quickForm), `${cls} - ${stream}`, quickLevel)}>
                        F{quickForm} {cls} {stream}
                      </Button>
                    ))
                  )
                ) : (
                  ZJC_OLEVEL_STREAMS.map(s => (
                    <Button key={s} variant="outline" size="sm"
                      onClick={() => handleQuickAdd(parseInt(quickForm), s, quickLevel)}>
                      F{quickForm} {s}
                    </Button>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="classes">
          <TabsList>
            <TabsTrigger value="classes">Classes ({filteredClasses.length})</TabsTrigger>
            <TabsTrigger value="assignments">Teacher Assignments ({assignments.length})</TabsTrigger>
            <TabsTrigger value="deleted">Deleted ({deletedClasses.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="classes">
            <div className="relative max-w-sm mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search classes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Name</TableHead><TableHead>Form</TableHead><TableHead>Level</TableHead><TableHead>Stream</TableHead><TableHead>Class Teacher</TableHead><TableHead>Year</TableHead><TableHead>Actions</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClasses.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>Form {c.form}</TableCell>
                        <TableCell><Badge variant="secondary">{c.level.replace("_", " ").toUpperCase()}</Badge></TableCell>
                        <TableCell>{c.stream || "—"}</TableCell>
                        <TableCell>{c.class_teacher_id ? getTeacherName(c.class_teacher_id) : "—"}</TableCell>
                        <TableCell>{c.academic_year}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setEditClass({...c}); setEditOpen(true); }}><Edit className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignments">
            <Card>
              <CardHeader><CardTitle>Assign Teacher to Class</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {/* Assignment type toggle */}
                <div className="flex gap-2">
                  <Button variant={assignType === "subject" ? "default" : "outline"} size="sm" onClick={() => setAssignType("subject")}>
                    Subject Teacher
                  </Button>
                  <Button variant={assignType === "class_teacher" ? "default" : "outline"} size="sm" onClick={() => setAssignType("class_teacher")}>
                    Class Teacher Only
                  </Button>
                </div>

                <div className="flex flex-wrap gap-3">
                  <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm flex-1 min-w-[150px]" value={assignTeacher} onChange={e => setAssignTeacher(e.target.value)}>
                    <option value="">Select Teacher...</option>
                    {teachers.map(t => {
                      const count = getTeacherClassCount(t.user_id);
                      return (
                        <option key={t.user_id} value={t.user_id}>
                          {t.full_name} ({count}/{MAX_CLASSES_PER_TEACHER} classes)
                        </option>
                      );
                    })}
                  </select>
                  <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm flex-1 min-w-[150px]" value={assignClass} onChange={e => setAssignClass(e.target.value)}>
                    <option value="">Select Class...</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {assignType === "subject" && (
                    <div className="flex gap-2 flex-1 min-w-[150px]">
                      <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm flex-1" value={assignSubject} onChange={e => setAssignSubject(e.target.value)}>
                        <option value="">Select Subject...</option>
                        {subjects.filter(s => !s.deleted_at).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <Button variant="outline" size="icon" onClick={() => setShowAddSubject(true)} title="Add new subject">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <Button onClick={handleAssign}>
                    <Plus className="w-4 h-4 mr-1" /> {assignType === "class_teacher" ? "Set Class Teacher" : "Assign"}
                  </Button>
                </div>

                {assignTeacher && getTeacherClassCount(assignTeacher) >= MAX_CLASSES_PER_TEACHER && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    This teacher has reached the maximum of {MAX_CLASSES_PER_TEACHER} classes.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Teacher</TableHead><TableHead>Class</TableHead><TableHead>Subject</TableHead><TableHead>Year</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {assignments.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{getTeacherName(a.teacher_id)}</TableCell>
                        <TableCell>{getClassName(a.class_id)}</TableCell>
                        <TableCell>{getSubjectName(a.subject_id)}</TableCell>
                        <TableCell>{a.academic_year}</TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => handleRemoveAssignment(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                    ))}
                    {/* Show class teacher assignments */}
                    {classes.filter(c => c.class_teacher_id).map(c => (
                      <TableRow key={`ct-${c.id}`} className="bg-muted/30">
                        <TableCell className="font-medium">{getTeacherName(c.class_teacher_id)}</TableCell>
                        <TableCell>{c.name}</TableCell>
                        <TableCell><Badge variant="outline">Class Teacher</Badge></TableCell>
                        <TableCell>{c.academic_year}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={async () => {
                            await supabase.from("classes").update({ class_teacher_id: null }).eq("id", c.id);
                            toast({ title: "Class Teacher Removed" }); fetchData();
                          }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deleted">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Form</TableHead><TableHead>Deleted</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {deletedClasses.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No deleted classes.</TableCell></TableRow>
                    ) : deletedClasses.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>Form {c.form}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(c.deleted_at).toLocaleDateString()}</TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => handleRestore(c.id)}><RotateCcw className="w-4 h-4 text-primary" /> Restore</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Class</DialogTitle></DialogHeader>
            {editClass && (
              <div className="space-y-3">
                <Input placeholder="Name" value={editClass.name} onChange={e => setEditClass({...editClass, name: e.target.value})} />
                <select className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm" value={editClass.form} onChange={e => setEditClass({...editClass, form: parseInt(e.target.value)})}>
                  {[1,2,3,4,5,6].map(f => <option key={f} value={f}>Form {f}</option>)}
                </select>
                <select className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm" value={editClass.level} onChange={e => setEditClass({...editClass, level: e.target.value})}>
                  <option value="zjc">ZJC</option><option value="o_level">O Level</option><option value="a_level">A Level</option>
                </select>
                <Input placeholder="Stream" value={editClass.stream || ""} onChange={e => setEditClass({...editClass, stream: e.target.value})} />
                <select className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm" value={editClass.class_teacher_id || ""} onChange={e => setEditClass({...editClass, class_teacher_id: e.target.value})}>
                  <option value="">No Class Teacher</option>
                  {teachers.map(t => <option key={t.user_id} value={t.user_id}>{t.full_name}</option>)}
                </select>
                <Button className="w-full" onClick={handleEdit}>Save Changes</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Subject Dialog */}
        <Dialog open={showAddSubject} onOpenChange={setShowAddSubject}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Subject</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Subject Name *" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} />
              <Input placeholder="Subject Code (optional)" value={newSubjectCode} onChange={e => setNewSubjectCode(e.target.value)} />
              <Button className="w-full" onClick={handleAddSubject}>Add Subject</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminClasses;

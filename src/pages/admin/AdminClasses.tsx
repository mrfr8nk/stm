import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Plus, Trash2, Edit, RotateCcw, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminClasses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<any[]>([]);
  const [deletedClasses, setDeletedClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [form, setForm] = useState("1");
  const [level, setLevel] = useState("o_level");
  const [stream, setStream] = useState("");
  const [search, setSearch] = useState("");
  const [editClass, setEditClass] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Assignment form
  const [assignTeacher, setAssignTeacher] = useState("");
  const [assignSubject, setAssignSubject] = useState("");
  const [assignClass, setAssignClass] = useState("");

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

  const handleAdd = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("classes").insert({ name: name.trim(), form: parseInt(form), level: level as any, stream: stream || null });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Class Added" }); setName(""); setStream(""); fetchData(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this class? It will be moved to trash.")) return;
    await supabase.from("classes").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
    toast({ title: "Class Deleted" });
    fetchData();
  };

  const handleRestore = async (id: string) => {
    await supabase.from("classes").update({ deleted_at: null } as any).eq("id", id);
    toast({ title: "Class Restored" });
    fetchData();
  };

  const handleEdit = async () => {
    if (!editClass) return;
    const { error } = await supabase.from("classes").update({
      name: editClass.name, form: editClass.form, level: editClass.level, stream: editClass.stream,
      class_teacher_id: editClass.class_teacher_id || null,
    }).eq("id", editClass.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Class Updated" }); setEditOpen(false); fetchData(); }
  };

  const handleAssign = async () => {
    if (!assignTeacher || !assignSubject || !assignClass) return;
    const { error } = await supabase.from("teacher_assignments").insert({
      teacher_id: assignTeacher, subject_id: assignSubject, class_id: assignClass,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Teacher Assigned" }); setAssignTeacher(""); setAssignSubject(""); setAssignClass(""); fetchData(); }
  };

  const handleRemoveAssignment = async (id: string) => {
    await supabase.from("teacher_assignments").delete().eq("id", id);
    toast({ title: "Assignment Removed" });
    fetchData();
  };

  const getTeacherName = (id: string) => teachers.find(t => t.user_id === id)?.full_name || "—";
  const getClassName = (id: string) => classes.find(c => c.id === id)?.name || "—";
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || "—";

  const filteredClasses = classes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Class Management</h1>

        {/* Add Class */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Add Class</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Input placeholder="Class name (e.g. Form 4A)" value={name} onChange={e => setName(e.target.value)} className="flex-1 min-w-[200px]" />
            <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={form} onChange={e => setForm(e.target.value)}>
              {[1,2,3,4,5,6].map(f => <option key={f} value={f}>Form {f}</option>)}
            </select>
            <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={level} onChange={e => setLevel(e.target.value)}>
              <option value="zjc">ZJC</option><option value="o_level">O Level</option><option value="a_level">A Level</option>
            </select>
            <Input placeholder="Stream (optional)" value={stream} onChange={e => setStream(e.target.value)} className="w-40" />
            <Button onClick={handleAdd}><Plus className="w-4 h-4 mr-1" /> Add</Button>
          </CardContent>
        </Card>

        <Tabs defaultValue="classes">
          <TabsList>
            <TabsTrigger value="classes">Classes ({filteredClasses.length})</TabsTrigger>
            <TabsTrigger value="assignments">Teacher Assignments ({assignments.length})</TabsTrigger>
            <TabsTrigger value="deleted">Recently Deleted ({deletedClasses.length})</TabsTrigger>
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
                    <TableRow>
                      <TableHead>Name</TableHead><TableHead>Form</TableHead><TableHead>Level</TableHead>
                      <TableHead>Stream</TableHead><TableHead>Class Teacher</TableHead><TableHead>Year</TableHead><TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClasses.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>Form {c.form}</TableCell>
                        <TableCell>{c.level.replace("_", " ").toUpperCase()}</TableCell>
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
              <CardHeader><CardTitle>Assign Teacher to Class & Subject</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-3 mb-4">
                <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm flex-1 min-w-[150px]" value={assignTeacher} onChange={e => setAssignTeacher(e.target.value)}>
                  <option value="">Select Teacher...</option>
                  {teachers.map(t => <option key={t.user_id} value={t.user_id}>{t.full_name}</option>)}
                </select>
                <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm flex-1 min-w-[150px]" value={assignClass} onChange={e => setAssignClass(e.target.value)}>
                  <option value="">Select Class...</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm flex-1 min-w-[150px]" value={assignSubject} onChange={e => setAssignSubject(e.target.value)}>
                  <option value="">Select Subject...</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <Button onClick={handleAssign}><Plus className="w-4 h-4 mr-1" /> Assign</Button>
              </CardContent>
            </Card>
            <Card className="mt-4">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Teacher</TableHead><TableHead>Class</TableHead><TableHead>Subject</TableHead><TableHead>Year</TableHead><TableHead>Actions</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map(a => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{getTeacherName(a.teacher_id)}</TableCell>
                        <TableCell>{getClassName(a.class_id)}</TableCell>
                        <TableCell>{getSubjectName(a.subject_id)}</TableCell>
                        <TableCell>{a.academic_year}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleRemoveAssignment(a.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
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
                  <TableHeader>
                    <TableRow><TableHead>Name</TableHead><TableHead>Form</TableHead><TableHead>Deleted</TableHead><TableHead>Actions</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedClasses.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No deleted classes.</TableCell></TableRow>
                    ) : deletedClasses.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>Form {c.form}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(c.deleted_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleRestore(c.id)}>
                            <RotateCcw className="w-4 h-4 text-primary" /> Restore
                          </Button>
                        </TableCell>
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
      </div>
    </DashboardLayout>
  );
};

export default AdminClasses;

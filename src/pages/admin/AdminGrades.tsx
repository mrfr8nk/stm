import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Search, TrendingUp, TrendingDown, Users, Trash2, RotateCcw, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const AdminGrades = () => {
  const { toast } = useToast();
  const [grades, setGrades] = useState<any[]>([]);
  const [deletedGrades, setDeletedGrades] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterTerm, setFilterTerm] = useState("");
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [editGrade, setEditGrade] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [gradesRes, classesRes, subjectsRes, profilesRes, sessionsRes] = await Promise.all([
      supabase.from("grades").select("*").order("created_at", { ascending: false }),
      supabase.from("classes").select("*").is("deleted_at", null).order("form"),
      supabase.from("subjects").select("*").is("deleted_at", null).order("name"),
      supabase.from("profiles").select("*"),
      supabase.from("academic_sessions").select("*").order("academic_year").order("term"),
    ]);
    const all = gradesRes.data || [];
    setGrades(all.filter((g: any) => !g.deleted_at));
    setDeletedGrades(all.filter((g: any) => g.deleted_at));
    setClasses(classesRes.data || []);
    setSubjects(subjectsRes.data || []);
    setProfiles(profilesRes.data || []);
    setSessions(sessionsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getName = (userId: string) => profiles.find((p: any) => p.user_id === userId)?.full_name || "Unknown";
  const getClassName = (id: string) => classes.find((c: any) => c.id === id)?.name || "—";
  const getSubjectName = (id: string) => subjects.find((s: any) => s.id === id)?.name || "—";

  const years = [...new Set(sessions.map(s => s.academic_year))].sort((a, b) => b - a);

  const filtered = grades.filter(g => {
    const matchSearch = getName(g.student_id).toLowerCase().includes(search.toLowerCase()) ||
      getSubjectName(g.subject_id).toLowerCase().includes(search.toLowerCase());
    const matchClass = !filterClass || g.class_id === filterClass;
    const matchSubject = !filterSubject || g.subject_id === filterSubject;
    const matchTerm = !filterTerm || g.term === filterTerm;
    const matchYear = !filterYear || g.academic_year === parseInt(filterYear);
    return matchSearch && matchClass && matchSubject && matchTerm && matchYear;
  });

  const marks = filtered.map(g => Number(g.mark));
  const stats = marks.length > 0 ? {
    total: filtered.length,
    avg: Math.round((marks.reduce((a, b) => a + b, 0) / marks.length) * 10) / 10,
    highest: Math.max(...marks),
    lowest: Math.min(...marks),
    passRate: Math.round((marks.filter(m => m >= 50).length / marks.length) * 100),
  } : { total: 0, avg: 0, highest: 0, lowest: 0, passRate: 0 };

  const handleDelete = async (id: string) => {
    await supabase.from("grades").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
    toast({ title: "Grade Deleted" }); fetchData();
  };

  const handleRestore = async (id: string) => {
    await supabase.from("grades").update({ deleted_at: null } as any).eq("id", id);
    toast({ title: "Grade Restored" }); fetchData();
  };

  const handleEditSave = async () => {
    if (!editGrade) return;
    const { error } = await supabase.from("grades").update({
      mark: editGrade.mark, comment: editGrade.comment,
    }).eq("id", editGrade.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Grade Updated" }); setEditOpen(false); fetchData(); }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Grades Overview</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Grades", value: stats.total, icon: BarChart3, color: "text-primary" },
            { label: "Average Mark", value: `${stats.avg}%`, icon: BarChart3, color: "text-secondary" },
            { label: "Highest", value: `${stats.highest}%`, icon: TrendingUp, color: "text-green-600" },
            { label: "Lowest", value: `${stats.lowest}%`, icon: TrendingDown, color: "text-destructive" },
            { label: "Pass Rate", value: `${stats.passRate}%`, icon: Users, color: "text-accent" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`p-2 rounded-lg bg-muted ${s.color}`}><s.icon className="w-5 h-5" /></div>
                <div><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters with Year */}
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
              <option value="">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={filterTerm} onChange={e => setFilterTerm(e.target.value)}>
              <option value="">All Terms</option>
              <option value="term_1">Term 1</option><option value="term_2">Term 2</option><option value="term_3">Term 3</option>
            </select>
            <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </CardContent>
        </Card>

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Grades ({filtered.length})</TabsTrigger>
            <TabsTrigger value="deleted">Deleted ({deletedGrades.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead><TableHead>Subject</TableHead><TableHead>Class</TableHead>
                      <TableHead>Year</TableHead><TableHead>Term</TableHead><TableHead>Mark</TableHead>
                      <TableHead>Grade</TableHead><TableHead>Teacher</TableHead><TableHead>Comment</TableHead><TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No grades found.</TableCell></TableRow>
                    ) : filtered.map(g => {
                      const mark = Number(g.mark);
                      const markColor = mark >= 70 ? "text-green-600" : mark >= 50 ? "text-yellow-600" : "text-destructive";
                      return (
                        <TableRow key={g.id}>
                          <TableCell className="font-medium">{getName(g.student_id)}</TableCell>
                          <TableCell>{getSubjectName(g.subject_id)}</TableCell>
                          <TableCell>{getClassName(g.class_id)}</TableCell>
                          <TableCell>{g.academic_year}</TableCell>
                          <TableCell>{g.term.replace("_", " ").toUpperCase()}</TableCell>
                          <TableCell className={`font-bold ${markColor}`}>{mark}%</TableCell>
                          <TableCell className="font-bold">{g.grade_letter || "—"}</TableCell>
                          <TableCell className="text-sm">{getName(g.teacher_id)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{g.comment || "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => { setEditGrade({...g}); setEditOpen(true); }}><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(g.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
                    <TableRow><TableHead>Student</TableHead><TableHead>Subject</TableHead><TableHead>Mark</TableHead><TableHead>Deleted</TableHead><TableHead>Actions</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedGrades.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No deleted grades.</TableCell></TableRow>
                    ) : deletedGrades.map(g => (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{getName(g.student_id)}</TableCell>
                        <TableCell>{getSubjectName(g.subject_id)}</TableCell>
                        <TableCell>{g.mark}%</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(g.deleted_at).toLocaleDateString()}</TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => handleRestore(g.id)}><RotateCcw className="w-4 h-4 text-primary" /> Restore</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Grade</DialogTitle></DialogHeader>
            {editGrade && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{getName(editGrade.student_id)} — {getSubjectName(editGrade.subject_id)}</p>
                <Input type="number" placeholder="Mark" value={editGrade.mark} onChange={e => setEditGrade({...editGrade, mark: Number(e.target.value)})} />
                <textarea className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm min-h-[80px]" placeholder="Comment" value={editGrade.comment || ""} onChange={e => setEditGrade({...editGrade, comment: e.target.value})} />
                <Button className="w-full" onClick={handleEditSave}>Save Changes</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminGrades;

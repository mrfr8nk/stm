import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Save, Trash2, Edit, TrendingUp, TrendingDown, Award, BarChart3, RotateCcw } from "lucide-react";
import ExportDropdown from "@/components/ExportDropdown";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getGrade, getGradeColor, getRowStyle, buildDistribution, type GradingScale } from "@/lib/grading";

const TeacherGrades = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<Record<string, { mark: string; comment: string }>>({});
  const [existingGrades, setExistingGrades] = useState<any[]>([]);
  const [deletedGrades, setDeletedGrades] = useState<any[]>([]);
  const [term, setTerm] = useState<string>("term_1");
  const [saving, setSaving] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [editGrade, setEditGrade] = useState<any>(null);
  const [editMark, setEditMark] = useState("");
  const [editComment, setEditComment] = useState("");
  const [stats, setStats] = useState({ highest: 0, lowest: 0, average: 0 });
  const [distribution, setDistribution] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [gradingScales, setGradingScales] = useState<GradingScale[]>([]);
  const [classTeacherClasses, setClassTeacherClasses] = useState<any[]>([]);
  const [classTeacherClassIds, setClassTeacherClassIds] = useState<Set<string>>(new Set());
  const [allSubjects, setAllSubjects] = useState<any[]>([]);

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

  // Load all subjects for class teachers
  useEffect(() => {
    if (classTeacherClasses.length === 0) return;
    supabase.from("subjects").select("*").is("deleted_at", null).then(({ data }) => setAllSubjects(data || []));
  }, [classTeacherClasses]);

  // Fetch grading scales when assignment changes
  useEffect(() => {
    if (!selectedAssignment?.classes?.level) { setGradingScales([]); return; }
    supabase.from("grading_scales").select("*")
      .eq("level", selectedAssignment.classes.level)
      .then(({ data }) => setGradingScales((data as GradingScale[]) || []));
  }, [selectedAssignment]);

  const fetchGrades = async () => {
    if (!selectedAssignment) return;
    const { data: spData } = await supabase.from("student_profiles")
      .select("*").eq("class_id", selectedAssignment.class_id).eq("is_active", true);
    if (spData && spData.length > 0) {
      const userIds = spData.map(s => s.user_id);
      const { data: profilesData } = await supabase.from("profiles")
        .select("user_id, full_name, email").in("user_id", userIds);
      const profileMap: Record<string, any> = {};
      (profilesData || []).forEach(p => { profileMap[p.user_id] = p; });
      setStudents(spData.map(s => ({ ...s, profiles: profileMap[s.user_id] || null })));
    } else {
      setStudents([]);
    }


    const { data: existing } = await supabase.from("grades").select("*")
      .eq("subject_id", selectedAssignment.subject_id).eq("class_id", selectedAssignment.class_id)
      .eq("term", term as any).is("deleted_at", null);

    const { data: deleted } = await supabase.from("grades").select("*")
      .eq("subject_id", selectedAssignment.subject_id).eq("class_id", selectedAssignment.class_id)
      .eq("term", term as any).not("deleted_at", "is", null);


    setExistingGrades(existing || []);
    setDeletedGrades(deleted || []);
    const gradeMap: Record<string, { mark: string; comment: string }> = {};
    (existing || []).forEach(g => { gradeMap[g.student_id] = { mark: g.mark.toString(), comment: g.comment || "" }; });
    setGrades(gradeMap);

    // Stats & distribution
    if (existing && existing.length > 0) {
      const marks = existing.map(g => Number(g.mark));
      setStats({ highest: Math.max(...marks), lowest: Math.min(...marks), average: Math.round(marks.reduce((a, b) => a + b, 0) / marks.length) });
      setDistribution(buildDistribution(marks, gradingScales));
    } else {
      setStats({ highest: 0, lowest: 0, average: 0 });
      setDistribution([]);
    }
  };

  useEffect(() => { fetchGrades(); }, [selectedAssignment, term, user, gradingScales]);

  const handleSave = async () => {
    if (!selectedAssignment || !user) return;
    setSaving(true);
    const upserts = students.filter(s => grades[s.user_id]?.mark).map(s => ({
      student_id: s.user_id, subject_id: selectedAssignment.subject_id,
      class_id: selectedAssignment.class_id, teacher_id: user.id,
      term: term as any, academic_year: new Date().getFullYear(),
      mark: parseFloat(grades[s.user_id].mark), comment: grades[s.user_id].comment || null,
    }));

    const { error } = await supabase.from("grades").upsert(upserts, { onConflict: "student_id,subject_id,term,academic_year" });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Grades Saved", description: `Saved ${upserts.length} grades.` });
      await supabase.from("activity_log").insert({ user_id: user.id, action: "Saved grades", details: `${selectedAssignment.subjects?.name} - ${term.replace("_", " ")}`, entity_type: "grades" });

      // Send grade notification emails
      const subjectName = selectedAssignment.subjects?.name || "Subject";
      const className = selectedAssignment.classes?.name || "Class";
      const level = selectedAssignment.classes?.level || "o_level";

      for (const upsert of upserts) {
        const student = students.find(s => s.user_id === upsert.student_id);
        if (!student) continue;
        const studentEmail = student.profiles?.email;
        const guardianEmail = student.guardian_email;
        const gradeLetter = grades[upsert.student_id]?.mark ? 
          (await supabase.rpc("calculate_grade", { _mark: upsert.mark, _level: level })).data || "" : "";

        const gradeData = {
          studentName: student.profiles?.full_name || "Student",
          subjectName,
          mark: upsert.mark,
          grade: gradeLetter,
          term,
          className,
          comment: upsert.comment || undefined,
        };

        if (studentEmail) {
          supabase.functions.invoke("send-branded-email", {
            body: { email: studentEmail, type: "grade_notification", grade_data: gradeData },
          }).catch(() => {});
        }
        if (guardianEmail && guardianEmail !== studentEmail) {
          supabase.functions.invoke("send-branded-email", {
            body: { email: guardianEmail, type: "grade_notification", grade_data: gradeData },
          }).catch(() => {});
        }
      }

      fetchGrades();
    }
    setSaving(false);
  };

  const handleDelete = async (gradeId: string) => {
    await supabase.from("grades").update({ deleted_at: new Date().toISOString() }).eq("id", gradeId);
    toast({ title: "Deleted" });
    fetchGrades();
  };

  const handleRestore = async (gradeId: string) => {
    await supabase.from("grades").update({ deleted_at: null }).eq("id", gradeId);
    toast({ title: "Restored" });
    fetchGrades();
  };

  const handleEditSave = async () => {
    if (!editGrade) return;
    await supabase.from("grades").update({ mark: parseFloat(editMark), comment: editComment || null }).eq("id", editGrade.id);
    toast({ title: "Updated" });
    setEditGrade(null);
    fetchGrades();
  };

  // Derive unique subjects and classes for filters
  // Build combined subject/class lists including class teacher access
  const subjectMap = new Map(assignments.map(a => [a.subject_id, a.subjects?.name || "Subject"]));
  // Class teachers get all subjects
  if (classTeacherClasses.length > 0) {
    allSubjects.forEach(s => { if (!subjectMap.has(s.id)) subjectMap.set(s.id, s.name); });
  }
  const uniqueSubjects = Array.from(subjectMap.entries());

  const classesForSubject = selectedSubjectId
    ? [
        ...assignments.filter(a => a.subject_id === selectedSubjectId),
        ...classTeacherClasses.filter(c => !assignments.some(a => a.class_id === c.id && a.subject_id === selectedSubjectId)).map(c => ({
          class_id: c.id, classes: c, subject_id: selectedSubjectId, subjects: allSubjects.find(s => s.id === selectedSubjectId),
        })),
      ]
    : assignments;
  const uniqueClasses = Array.from(new Map(classesForSubject.map(a => [a.class_id, a.classes?.name || "Class"])).entries());

  useEffect(() => {
    if (selectedSubjectId && selectedClassId) {
      const match = assignments.find(a => a.subject_id === selectedSubjectId && a.class_id === selectedClassId);
      if (match) {
        setSelectedAssignment(match);
      } else if (classTeacherClassIds.has(selectedClassId)) {
        // Class teacher accessing a subject they don't teach directly
        const cls = classTeacherClasses.find(c => c.id === selectedClassId);
        const sub = allSubjects.find(s => s.id === selectedSubjectId);
        if (cls && sub) {
          setSelectedAssignment({ class_id: selectedClassId, subject_id: selectedSubjectId, classes: cls, subjects: sub });
        }
      }
    }
  }, [selectedSubjectId, selectedClassId, assignments, classTeacherClassIds]);

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Set Grades</h1>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1.5 min-w-[160px]">
                <label className="text-xs font-medium text-muted-foreground">Term</label>
                <select className="w-full border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm" value={term} onChange={e => setTerm(e.target.value)}>
                  <option value="term_1">Term 1</option><option value="term_2">Term 2</option><option value="term_3">Term 3</option>
                </select>
              </div>
              <div className="space-y-1.5 min-w-[200px] flex-1">
                <label className="text-xs font-medium text-muted-foreground">Subject</label>
                <select className="w-full border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm" value={selectedSubjectId} onChange={e => { setSelectedSubjectId(e.target.value); setSelectedClassId(""); setSelectedAssignment(null); }}>
                  <option value="">— Select Subject —</option>
                  {uniqueSubjects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </div>
              <div className="space-y-1.5 min-w-[200px] flex-1">
                <label className="text-xs font-medium text-muted-foreground">Class</label>
                <select className="w-full border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} disabled={!selectedSubjectId}>
                  <option value="">— Select Class —</option>
                  {uniqueClasses.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </div>
            </div>
            {assignments.length === 0 && <p className="text-muted-foreground mt-3 text-sm">No subject assignments found. Ask your admin to assign you classes.</p>}
            {selectedSubjectId && (
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border">
                {classesForSubject.map(a => (
                  <Badge key={a.id} variant={selectedAssignment?.id === a.id ? "default" : "outline"} className="cursor-pointer px-3 py-1.5 text-sm" onClick={() => { setSelectedClassId(a.class_id); }}>
                    {a.classes?.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedAssignment && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-4 flex items-center gap-3"><TrendingUp className="w-6 h-6 text-green-600" /><div><p className="text-xl font-bold text-green-600">{stats.highest}%</p><p className="text-xs text-muted-foreground">Highest</p></div></CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3"><TrendingDown className="w-6 h-6 text-red-600" /><div><p className="text-xl font-bold text-red-600">{stats.lowest}%</p><p className="text-xs text-muted-foreground">Lowest</p></div></CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3"><Award className="w-6 h-6 text-primary" /><div><p className="text-xl font-bold text-primary">{stats.average}%</p><p className="text-xs text-muted-foreground">Average</p></div></CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3"><BarChart3 className="w-6 h-6 text-secondary" /><div><p className="text-xl font-bold">{existingGrades.length}</p><p className="text-xs text-muted-foreground">Recorded</p></div></CardContent></Card>
            </div>

            {/* Distribution Chart */}
            {distribution.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Grade Distribution</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={distribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Students" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Grade Entry */}
            {students.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" /> {selectedAssignment.subjects?.name} — {selectedAssignment.classes?.name}
                  </CardTitle>
                  <div className="flex gap-2">
                    <ExportDropdown
                      title={`${selectedAssignment.subjects?.name} — ${selectedAssignment.classes?.name} Grades`}
                      filename={`grades_${selectedAssignment.subjects?.name}_${selectedAssignment.classes?.name}`}
                      headers={["#", "Student", "Mark", "Grade", "Comment"]}
                      rows={students.map((s, i) => {
                        const existing = existingGrades.find(g => g.student_id === s.user_id);
                        const mark = grades[s.user_id]?.mark || existing?.mark || "";
                        const grade = mark ? getGrade(Number(mark), gradingScales) : "";
                        return [i + 1, s.profiles?.full_name || "Student", mark, grade, grades[s.user_id]?.comment || existing?.comment || ""];
                      })}
                    />
                    <Button variant="outline" size="sm" onClick={() => setShowDeleted(!showDeleted)}>
                      <RotateCcw className="w-4 h-4 mr-1" /> Deleted ({deletedGrades.length})
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Grades"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {students.map((s, i) => {
                      const existing = existingGrades.find(g => g.student_id === s.user_id);
                      const mark = grades[s.user_id]?.mark || "";
                      const grade = mark ? getGrade(Number(mark), gradingScales) : "";
                      return (
                        <div key={s.id} className={`flex flex-wrap items-center gap-3 p-3 rounded-lg border-l-4 transition-all ${
                          grade ? getRowStyle(grade) : "border-l-transparent bg-muted/50"
                        }`}>
                          <span className="w-8 text-sm text-muted-foreground">{i + 1}.</span>
                          <span className="flex-1 min-w-[150px] font-medium text-foreground">{s.profiles?.full_name || "Student"}</span>
                          <Input type="number" min={0} max={100} placeholder="Mark" className="w-24"
                            value={mark} onChange={e => setGrades(prev => ({ ...prev, [s.user_id]: { ...prev[s.user_id], mark: e.target.value, comment: prev[s.user_id]?.comment || "" } }))} />
                          {grade && <span className={`px-2 py-1 rounded text-xs font-bold ${getGradeColor(grade)}`}>{grade}</span>}
                          <Input placeholder="Comment" className="flex-1 min-w-[150px]"
                            value={grades[s.user_id]?.comment || ""} onChange={e => setGrades(prev => ({ ...prev, [s.user_id]: { ...prev[s.user_id], comment: e.target.value, mark: prev[s.user_id]?.mark || "" } }))} />
                          {existing && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => { setEditGrade(existing); setEditMark(existing.mark.toString()); setEditComment(existing.comment || ""); }}>
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(existing.id)} className="text-red-500"><Trash2 className="w-3 h-3" /></Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Deleted Grades */}
            {showDeleted && deletedGrades.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg text-red-600">Recently Deleted</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {deletedGrades.map(g => {
                    const student = students.find(s => s.user_id === g.student_id);
                    return (
                      <div key={g.id} className="flex items-center gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                        <span className="flex-1 text-sm">{student?.profiles?.full_name || g.student_id} — {g.mark}%</span>
                        <Button variant="outline" size="sm" onClick={() => handleRestore(g.id)}><RotateCcw className="w-3 h-3 mr-1" /> Restore</Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editGrade} onOpenChange={() => setEditGrade(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Edit Grade</DialogTitle></DialogHeader>
            <Input type="number" min={0} max={100} placeholder="Mark" value={editMark} onChange={e => setEditMark(e.target.value)} />
            {editMark && <span className={`px-2 py-1 rounded text-xs font-bold self-start ${getGradeColor(getGrade(Number(editMark), gradingScales))}`}>{getGrade(Number(editMark), gradingScales)}</span>}
            <Input placeholder="Comment" value={editComment} onChange={e => setEditComment(e.target.value)} />
            <Button onClick={handleEditSave}>Save</Button>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default TeacherGrades;

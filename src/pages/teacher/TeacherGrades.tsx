import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Save } from "lucide-react";

const TeacherGrades = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<Record<string, { mark: string; comment: string }>>({});
  const [term, setTerm] = useState<string>("term_1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("teacher_assignments")
      .select("*, classes(*), subjects(*)")
      .eq("teacher_id", user.id)
      .then(({ data }) => setAssignments(data || []));
  }, [user]);

  useEffect(() => {
    if (!selectedAssignment) return;
    const fetchStudentsAndGrades = async () => {
      const { data: studentData } = await supabase
        .from("student_profiles")
        .select("*, profiles!student_profiles_user_id_fkey(full_name)")
        .eq("class_id", selectedAssignment.class_id)
        .eq("is_active", true);

      setStudents(studentData || []);

      // Load existing grades
      const { data: existingGrades } = await supabase
        .from("grades")
        .select("*")
        .eq("subject_id", selectedAssignment.subject_id)
        .eq("class_id", selectedAssignment.class_id)
        .eq("term", term)
        .eq("teacher_id", user!.id);

      const gradeMap: Record<string, { mark: string; comment: string }> = {};
      (existingGrades || []).forEach(g => {
        gradeMap[g.student_id] = { mark: g.mark.toString(), comment: g.comment || "" };
      });
      setGrades(gradeMap);
    };
    fetchStudentsAndGrades();
  }, [selectedAssignment, term, user]);

  const handleSave = async () => {
    if (!selectedAssignment || !user) return;
    setSaving(true);

    const upserts = students
      .filter(s => grades[s.user_id]?.mark)
      .map(s => ({
        student_id: s.user_id,
        subject_id: selectedAssignment.subject_id,
        class_id: selectedAssignment.class_id,
        teacher_id: user.id,
        term: term as any,
        academic_year: new Date().getFullYear(),
        mark: parseFloat(grades[s.user_id].mark),
        comment: grades[s.user_id].comment || null,
      }));

    const { error } = await supabase.from("grades").upsert(upserts, {
      onConflict: "student_id,subject_id,term,academic_year",
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Grades Saved", description: `Saved ${upserts.length} grades.` });
    }
    setSaving(false);
  };

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Set Grades</h1>

        <div className="flex flex-wrap gap-4">
          <select
            className="border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm"
            value={term}
            onChange={e => setTerm(e.target.value)}
          >
            <option value="term_1">Term 1</option>
            <option value="term_2">Term 2</option>
            <option value="term_3">Term 3</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {assignments.map((a) => (
            <Card
              key={a.id}
              className={`cursor-pointer transition-all hover:shadow-card-hover ${selectedAssignment?.id === a.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => setSelectedAssignment(a)}
            >
              <CardContent className="p-4">
                <p className="font-bold text-foreground">{a.subjects?.name || "Subject"}</p>
                <p className="text-sm text-muted-foreground">{a.classes?.name || "Class"}</p>
              </CardContent>
            </Card>
          ))}
          {assignments.length === 0 && <p className="text-muted-foreground">No subject assignments found.</p>}
        </div>

        {selectedAssignment && students.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                {selectedAssignment.subjects?.name} — {selectedAssignment.classes?.name}
              </CardTitle>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Grades"}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {students.map((s, i) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <span className="w-8 text-sm text-muted-foreground">{i + 1}.</span>
                    <span className="flex-1 min-w-[150px] font-medium text-foreground">{s.profiles?.full_name || "Student"}</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="Mark"
                      className="w-24"
                      value={grades[s.user_id]?.mark || ""}
                      onChange={e => setGrades(prev => ({ ...prev, [s.user_id]: { ...prev[s.user_id], mark: e.target.value, comment: prev[s.user_id]?.comment || "" } }))}
                    />
                    <Input
                      placeholder="Comment (optional)"
                      className="flex-1 min-w-[200px]"
                      value={grades[s.user_id]?.comment || ""}
                      onChange={e => setGrades(prev => ({ ...prev, [s.user_id]: { ...prev[s.user_id], comment: e.target.value, mark: prev[s.user_id]?.mark || "" } }))}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherGrades;

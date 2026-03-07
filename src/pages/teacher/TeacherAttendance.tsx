import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, Save, Check, X, Clock } from "lucide-react";

const TeacherAttendance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("teacher_assignments").select("*, classes(*)").eq("teacher_id", user.id)
      .then(({ data }) => setAssignments(data || []));
  }, [user]);

  const uniqueClasses = Array.from(new Map(assignments.map(a => [a.class_id, a.classes])).values()).filter(Boolean);

  useEffect(() => {
    if (!selectedClassId || !user) return;
    const fetch = async () => {
      const { data: studentData } = await supabase
        .from("student_profiles")
        .select("*, profiles!student_profiles_user_id_fkey(full_name)")
        .eq("class_id", selectedClassId)
        .eq("is_active", true);
      setStudents(studentData || []);

      const { data: existingAtt } = await supabase
        .from("attendance")
        .select("*")
        .eq("class_id", selectedClassId)
        .eq("date", date);

      const attMap: Record<string, string> = {};
      (existingAtt || []).forEach(a => { attMap[a.student_id] = a.status; });
      setAttendance(attMap);
    };
    fetch();
  }, [selectedClassId, date, user]);

  const handleSave = async () => {
    if (!selectedClassId || !user) return;
    setSaving(true);

    const records = students.map(s => ({
      student_id: s.user_id,
      class_id: selectedClassId,
      date,
      status: (attendance[s.user_id] || "present") as any,
      marked_by: user.id,
    }));

    const { error } = await supabase.from("attendance").upsert(records, { onConflict: "student_id,date" });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Attendance Saved", description: `Saved for ${records.length} students.` });
    }
    setSaving(false);
  };

  const markAll = (status: string) => {
    const map: Record<string, string> = {};
    students.forEach(s => { map[s.user_id] = status; });
    setAttendance(map);
  };

  const statusColors: Record<string, string> = {
    present: "bg-green-500/20 text-green-700 border-green-500",
    absent: "bg-red-500/20 text-red-700 border-red-500",
    late: "bg-yellow-500/20 text-yellow-700 border-yellow-500",
    excused: "bg-blue-500/20 text-blue-700 border-blue-500",
  };

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Attendance</h1>

        <div className="flex flex-wrap gap-4 items-center">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm" />
          <div className="flex gap-2">
            {uniqueClasses.map((cls: any) => (
              <Button key={cls.id} variant={selectedClassId === cls.id ? "default" : "outline"} onClick={() => setSelectedClassId(cls.id)} size="sm">
                {cls.name}
              </Button>
            ))}
          </div>
        </div>

        {selectedClassId && students.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5" /> Mark Attendance — {date}
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => markAll("present")}>
                  <Check className="w-4 h-4 mr-1" /> All Present
                </Button>
                <Button size="sm" variant="outline" onClick={() => markAll("absent")}>
                  <X className="w-4 h-4 mr-1" /> All Absent
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {students.map((s, i) => {
                  const status = attendance[s.user_id] || "present";
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <span className="w-8 text-sm text-muted-foreground">{i + 1}.</span>
                      <span className="flex-1 font-medium text-foreground">{s.profiles?.full_name || "Student"}</span>
                      <div className="flex gap-1">
                        {["present", "absent", "late", "excused"].map(st => (
                          <button
                            key={st}
                            onClick={() => setAttendance(prev => ({ ...prev, [s.user_id]: st }))}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${status === st ? statusColors[st] : "bg-muted text-muted-foreground border-transparent"}`}
                          >
                            {st === "present" && <Check className="w-3 h-3 inline mr-1" />}
                            {st === "absent" && <X className="w-3 h-3 inline mr-1" />}
                            {st === "late" && <Clock className="w-3 h-3 inline mr-1" />}
                            {st.charAt(0).toUpperCase() + st.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherAttendance;

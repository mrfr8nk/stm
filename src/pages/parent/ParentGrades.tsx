import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { BookOpen } from "lucide-react";

const ParentGrades = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<string[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [term, setTerm] = useState("term_1");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: links } = await supabase.from("parent_student_links").select("student_id").eq("parent_id", user.id);
      const ids = (links || []).map(l => l.student_id);
      setChildren(ids);

      if (ids.length > 0) {
        const [g, p] = await Promise.all([
          supabase.from("grades").select("*, subjects(name, code)").in("student_id", ids).eq("term", term as any).is("deleted_at", null),
          supabase.from("profiles").select("*").in("user_id", ids),
        ]);
        setGrades(g.data || []);
        setProfiles(p.data || []);
      }
      setLoading(false);
    };
    fetch();
  }, [user, term]);

  const getName = (uid: string) => profiles.find(p => p.user_id === uid)?.full_name || "Student";

  return (
    <DashboardLayout role="parent">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Children's Grades</h1>
        <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={term} onChange={e => setTerm(e.target.value)}>
          <option value="term_1">Term 1</option>
          <option value="term_2">Term 2</option>
          <option value="term_3">Term 3</option>
        </select>

        {loading ? (
          <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : children.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No children linked.</CardContent></Card>
        ) : (
          children.map(childId => {
            const childGrades = grades.filter(g => g.student_id === childId);
            return (
              <Card key={childId}>
                <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" /> {getName(childId)}</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead><TableHead>Code</TableHead>
                        <TableHead>Mark</TableHead><TableHead>Grade</TableHead><TableHead>Comment</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {childGrades.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No grades this term.</TableCell></TableRow>
                      ) : childGrades.map(g => (
                        <TableRow key={g.id}>
                          <TableCell className="font-medium">{g.subjects?.name}</TableCell>
                          <TableCell>{g.subjects?.code || "—"}</TableCell>
                          <TableCell className={`font-bold ${g.mark >= 70 ? "text-green-600" : g.mark >= 50 ? "text-yellow-600" : "text-destructive"}`}>{g.mark}%</TableCell>
                          <TableCell><span className="px-2 py-1 rounded bg-primary/10 text-primary font-bold text-sm">{g.grade_letter || "—"}</span></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{g.comment || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
};

export default ParentGrades;

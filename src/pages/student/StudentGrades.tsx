import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen } from "lucide-react";

const StudentGrades = () => {
  const { user } = useAuth();
  const [grades, setGrades] = useState<any[]>([]);
  const [scales, setScales] = useState<any[]>([]);
  const [term, setTerm] = useState("term_1");

  useEffect(() => {
    if (!user) return;
    supabase.from("grading_scales").select("*").order("level").order("min_mark", { ascending: false })
      .then(({ data }) => setScales(data || []));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase.from("grades").select("*, subjects(name, code)").eq("student_id", user.id).eq("term", term as any)
      .order("created_at", { ascending: false })
      .then(({ data }) => setGrades(data || []));
  }, [user, term]);

  const levelGroups = ["zjc", "o_level", "a_level"];

  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">My Grades</h1>

        <Tabs defaultValue="grades">
          <TabsList>
            <TabsTrigger value="grades">My Grades</TabsTrigger>
            <TabsTrigger value="scales">Grading Scales</TabsTrigger>
          </TabsList>

          <TabsContent value="grades" className="space-y-4">
            <select className="border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm" value={term} onChange={e => setTerm(e.target.value)}>
              <option value="term_1">Term 1</option>
              <option value="term_2">Term 2</option>
              <option value="term_3">Term 3</option>
            </select>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" /> Grades</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Mark</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Comment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grades.map(g => (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{g.subjects?.name}</TableCell>
                        <TableCell>{g.subjects?.code}</TableCell>
                        <TableCell className="font-bold">{g.mark}%</TableCell>
                        <TableCell><span className="px-2 py-1 rounded bg-primary/10 text-primary font-bold text-sm">{g.grade_letter || "—"}</span></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{g.comment || "—"}</TableCell>
                      </TableRow>
                    ))}
                    {grades.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No grades for this term yet.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scales" className="space-y-4">
            {levelGroups.map(level => {
              const levelScales = scales.filter(s => s.level === level);
              if (levelScales.length === 0) return null;
              return (
                <Card key={level}>
                  <CardHeader>
                    <CardTitle className="text-lg">{level.replace("_", " ").toUpperCase()} Grading Scale</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Grade</TableHead><TableHead>Min Mark</TableHead><TableHead>Max Mark</TableHead><TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {levelScales.map(s => (
                          <TableRow key={s.id}>
                            <TableCell className="font-bold text-lg">{s.grade_letter}</TableCell>
                            <TableCell>{s.min_mark}%</TableCell>
                            <TableCell>{s.max_mark}%</TableCell>
                            <TableCell className="text-muted-foreground">{s.description || "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default StudentGrades;

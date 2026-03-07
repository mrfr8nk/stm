import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Plus } from "lucide-react";

const AdminSubjects = () => {
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const fetch = async () => {
    const { data } = await supabase.from("subjects").select("*").order("name");
    setSubjects(data || []);
  };

  useEffect(() => { fetch(); }, []);

  const handleAdd = async () => {
    if (!name.trim() || !code.trim()) return;
    const { error } = await supabase.from("subjects").insert({ name: name.trim(), code: code.trim().toUpperCase() });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Subject Added" }); setName(""); setCode(""); fetch(); }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Subject Management</h1>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Add Subject</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Input placeholder="Subject name" value={name} onChange={e => setName(e.target.value)} className="flex-1 min-w-[200px]" />
            <Input placeholder="Code (e.g. MATH)" value={code} onChange={e => setCode(e.target.value)} className="w-32" />
            <Button onClick={handleAdd}><Plus className="w-4 h-4 mr-1" /> Add</Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Level</TableHead><TableHead>Compulsory</TableHead></TableRow></TableHeader>
              <TableBody>
                {subjects.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.code}</TableCell>
                    <TableCell>{s.level ? s.level.replace("_", " ").toUpperCase() : "All"}</TableCell>
                    <TableCell>{s.is_compulsory ? "Yes" : "No"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminSubjects;

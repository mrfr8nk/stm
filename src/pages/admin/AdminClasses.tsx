import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Plus } from "lucide-react";

const AdminClasses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [form, setForm] = useState("1");
  const [level, setLevel] = useState("o_level");
  const [stream, setStream] = useState("");

  const fetchClasses = async () => {
    const { data } = await supabase.from("classes").select("*").order("form").order("name");
    setClasses(data || []);
  };

  useEffect(() => { fetchClasses(); }, []);

  const handleAdd = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("classes").insert({ name: name.trim(), form: parseInt(form), level: level as any, stream: stream || null });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Class Added" }); setName(""); setStream(""); fetchClasses(); }
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Class Management</h1>
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
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Form</TableHead><TableHead>Level</TableHead><TableHead>Stream</TableHead><TableHead>Year</TableHead></TableRow></TableHeader>
              <TableBody>
                {classes.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>Form {c.form}</TableCell>
                    <TableCell>{c.level.replace("_", " ").toUpperCase()}</TableCell>
                    <TableCell>{c.stream || "—"}</TableCell>
                    <TableCell>{c.academic_year}</TableCell>
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

export default AdminClasses;

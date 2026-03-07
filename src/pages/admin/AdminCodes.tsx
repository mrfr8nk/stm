import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Key, Plus, Copy, Check } from "lucide-react";

const AdminCodes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [codes, setCodes] = useState<any[]>([]);
  const [role, setRole] = useState<string>("teacher");
  const [count, setCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchCodes = async () => {
    const { data } = await supabase.from("access_codes").select("*").order("created_at", { ascending: false });
    setCodes(data || []);
  };

  useEffect(() => { fetchCodes(); }, []);

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    const newCodes = Array.from({ length: count }, () => ({
      code: generateCode(),
      role: role as any,
      created_by: user.id,
    }));
    const { error } = await supabase.from("access_codes").insert(newCodes);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Codes Generated", description: `${count} ${role} code(s) created.` }); fetchCodes(); }
    setGenerating(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Access Codes</h1>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Generate Codes</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-sm font-medium">Role</label>
              <select className="block border border-input rounded-lg px-3 py-2 bg-background text-sm" value={role} onChange={e => setRole(e.target.value)}>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Count</label>
              <select className="block border border-input rounded-lg px-3 py-2 bg-background text-sm" value={count} onChange={e => setCount(parseInt(e.target.value))}>
                {[1, 5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <Button onClick={handleGenerate} disabled={generating}>
              <Key className="w-4 h-4 mr-1" /> {generating ? "Generating..." : "Generate"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>All Codes</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Code</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead></TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {codes.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-bold text-primary">{c.code}</TableCell>
                    <TableCell>{c.role}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.used ? "bg-muted text-muted-foreground" : "bg-green-100 text-green-700"}`}>
                        {c.used ? "Used" : "Available"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {!c.used && (
                        <Button variant="ghost" size="sm" onClick={() => copyCode(c.code)}>
                          {copied === c.code ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      )}
                    </TableCell>
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

export default AdminCodes;

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Plus, Copy, Check, Trash2, RotateCcw, Clock, Users, AlertTriangle } from "lucide-react";

const AdminCodes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [codes, setCodes] = useState<any[]>([]);
  const [deletedCodes, setDeletedCodes] = useState<any[]>([]);
  const [role, setRole] = useState<string>("teacher");
  const [count, setCount] = useState(1);
  const [maxUses, setMaxUses] = useState(1);
  const [expiryDays, setExpiryDays] = useState<string>("");
  const [customExpiry, setCustomExpiry] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchData = async () => {
    const { data } = await supabase.from("access_codes").select("*").order("created_at", { ascending: false });
    const all = data || [];
    setCodes(all.filter((c: any) => !c.deleted_at));
    setDeletedCodes(all.filter((c: any) => c.deleted_at));
  };

  useEffect(() => { fetchData(); }, []);

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const getExpiresAt = (): string | null => {
    if (customExpiry) return new Date(customExpiry + "T23:59:59").toISOString();
    if (!expiryDays) return null;
    const d = new Date();
    d.setDate(d.getDate() + parseInt(expiryDays));
    return d.toISOString();
  };

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    const expires_at = getExpiresAt();
    const newCodes = Array.from({ length: count }, () => ({
      code: generateCode(),
      role: role as any,
      created_by: user.id,
      expires_at,
      max_uses: maxUses,
    }));
    const { error } = await supabase.from("access_codes").insert(newCodes as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Codes Generated", description: `${count} ${role} code(s) created.` }); fetchData(); }
    setGenerating(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("access_codes").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
    toast({ title: "Code Deleted" }); fetchData();
  };

  const handleRestore = async (id: string) => {
    await supabase.from("access_codes").update({ deleted_at: null } as any).eq("id", id);
    toast({ title: "Code Restored" }); fetchData();
  };

  const isExpired = (c: any) => c.expires_at && new Date(c.expires_at) < new Date();
  const isFullyUsed = (c: any) => {
    const uses = (c as any).use_count ?? (c.used ? 1 : 0);
    const max = (c as any).max_uses ?? 1;
    return uses >= max;
  };

  const getStatus = (c: any) => {
    if (isExpired(c)) return { label: "Expired", cls: "bg-destructive/10 text-destructive" };
    if (isFullyUsed(c)) return { label: "Fully Used", cls: "bg-muted text-muted-foreground" };
    if ((c as any).use_count > 0) return { label: "Partially Used", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
    return { label: "Available", cls: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
  };

  const totalActive = codes.filter(c => !isExpired(c) && !isFullyUsed(c)).length;
  const totalUsed = codes.filter(c => isFullyUsed(c)).length;
  const totalExpired = codes.filter(c => isExpired(c) && !isFullyUsed(c)).length;

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Access Codes</h1>
          <p className="text-sm text-muted-foreground">Generate, manage & track signup codes for all roles</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{codes.length}</p><p className="text-xs text-muted-foreground">Total Codes</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{totalActive}</p><p className="text-xs text-muted-foreground">Available</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{totalUsed}</p><p className="text-xs text-muted-foreground">Fully Used</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{totalExpired}</p><p className="text-xs text-muted-foreground">Expired</p>
          </CardContent></Card>
        </div>

        {/* Generate */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Generate Codes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Role</label>
                <select className="block border border-input rounded-lg px-3 py-2 bg-background text-sm" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Count</label>
                <select className="block border border-input rounded-lg px-3 py-2 bg-background text-sm" value={count} onChange={e => setCount(parseInt(e.target.value))}>
                  {[1, 5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> Max Uses</label>
                <select className="block border border-input rounded-lg px-3 py-2 bg-background text-sm" value={maxUses} onChange={e => setMaxUses(parseInt(e.target.value))}>
                  {[1, 5, 10, 25, 50, 100].map(n => <option key={n} value={n}>{n} use{n > 1 ? "s" : ""}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Expiry</label>
                <select className="block border border-input rounded-lg px-3 py-2 bg-background text-sm" value={expiryDays} onChange={e => { setExpiryDays(e.target.value); if (e.target.value !== "custom") setCustomExpiry(""); }}>
                  <option value="">Never</option>
                  <option value="1">1 day</option>
                  <option value="3">3 days</option>
                  <option value="7">1 week</option>
                  <option value="14">2 weeks</option>
                  <option value="30">1 month</option>
                  <option value="90">3 months</option>
                  <option value="custom">Custom date</option>
                </select>
              </div>
              {expiryDays === "custom" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Expiry Date</label>
                  <Input type="date" value={customExpiry} onChange={e => setCustomExpiry(e.target.value)} min={new Date().toISOString().split("T")[0]} />
                </div>
              )}
            </div>
            {role === "admin" && (
              <p className="text-xs text-amber-600 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                <AlertTriangle className="w-3 h-3" /> Admin codes grant full system access. Generate with caution.
              </p>
            )}
            <Button onClick={handleGenerate} disabled={generating}>
              <Key className="w-4 h-4 mr-1" /> {generating ? "Generating..." : "Generate"}
            </Button>
          </CardContent>
        </Card>

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active ({codes.length})</TabsTrigger>
            <TabsTrigger value="deleted">Deleted ({deletedCodes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uses</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No codes generated yet.</TableCell></TableRow>
                    ) : codes.map(c => {
                      const status = getStatus(c);
                      const useCount = (c as any).use_count ?? (c.used ? 1 : 0);
                      const max = (c as any).max_uses ?? 1;
                      return (
                        <TableRow key={c.id} className={isExpired(c) ? "opacity-60" : ""}>
                          <TableCell className="font-mono font-bold text-primary">{c.code}</TableCell>
                          <TableCell className="capitalize">{c.role}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.cls}`}>{status.label}</span>
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className="font-medium">{useCount}</span>
                            <span className="text-muted-foreground">/{max}</span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {c.expires_at ? (
                              <span className={isExpired(c) ? "text-destructive" : ""}>
                                {new Date(c.expires_at).toLocaleDateString()}
                              </span>
                            ) : "Never"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {!isFullyUsed(c) && !isExpired(c) && (
                                <Button variant="ghost" size="sm" onClick={() => copyCode(c.code)}>
                                  {copied === c.code ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
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
                  <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Role</TableHead><TableHead>Deleted</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {deletedCodes.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No deleted codes.</TableCell></TableRow>
                    ) : deletedCodes.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono">{c.code}</TableCell>
                        <TableCell className="capitalize">{c.role}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(c.deleted_at).toLocaleDateString()}</TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => handleRestore(c.id)}><RotateCcw className="w-4 h-4 text-primary" /> Restore</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminCodes;

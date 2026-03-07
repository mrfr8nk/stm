import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Calendar, Plus, CheckCircle, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const AdminSettings = () => {
  const { toast } = useToast();
  const [scales, setScales] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [editSession, setEditSession] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editScale, setEditScale] = useState<any>(null);
  const [editScaleOpen, setEditScaleOpen] = useState(false);

  const [scaleLevel, setScaleLevel] = useState("o_level");
  const [scaleLetter, setScaleLetter] = useState("");
  const [scaleMin, setScaleMin] = useState("");
  const [scaleMax, setScaleMax] = useState("");
  const [scaleDesc, setScaleDesc] = useState("");
  const [filterLevel, setFilterLevel] = useState("");

  const fetchData = async () => {
    const [scaleRes, sessionRes] = await Promise.all([
      supabase.from("grading_scales").select("*").order("level").order("min_mark", { ascending: false }),
      supabase.from("academic_sessions").select("*").order("academic_year", { ascending: false }).order("term"),
    ]);
    setScales(scaleRes.data || []);
    const allSessions = sessionRes.data || [];
    setSessions(allSessions);
    setCurrentSession(allSessions.find((s: any) => s.is_current) || null);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSetCurrent = async (id: string) => {
    await supabase.from("academic_sessions").update({ is_current: false }).neq("id", "none");
    await supabase.from("academic_sessions").update({ is_current: true }).eq("id", id);
    toast({ title: "Current Session Updated" });
    fetchData();
  };

  const handleAddScale = async () => {
    if (!scaleLetter || !scaleMin || !scaleMax) return;
    const { error } = await supabase.from("grading_scales").insert({
      level: scaleLevel as any, grade_letter: scaleLetter.toUpperCase(),
      min_mark: Number(scaleMin), max_mark: Number(scaleMax), description: scaleDesc || null,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Grading Scale Added" }); setScaleLetter(""); setScaleMin(""); setScaleMax(""); setScaleDesc(""); fetchData(); }
  };

  const handleDeleteScale = async (id: string) => {
    if (!confirm("Delete this grading scale?")) return;
    await supabase.from("grading_scales").delete().eq("id", id);
    toast({ title: "Scale Deleted" }); fetchData();
  };

  const handleEditScale = async () => {
    if (!editScale) return;
    const { error } = await supabase.from("grading_scales").update({
      grade_letter: editScale.grade_letter, min_mark: Number(editScale.min_mark),
      max_mark: Number(editScale.max_mark), description: editScale.description,
    }).eq("id", editScale.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Scale Updated" }); setEditScaleOpen(false); fetchData(); }
  };

  const handleEditSession = async () => {
    if (!editSession) return;
    const { error } = await supabase.from("academic_sessions").update({
      start_date: editSession.start_date, end_date: editSession.end_date,
    }).eq("id", editSession.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Session Updated" }); setEditOpen(false); fetchData(); }
  };

  const termLabel = (t: string) => t.replace("_", " ").toUpperCase();

  const getAutoTerm = () => {
    const month = new Date().getMonth() + 1;
    if (month >= 1 && month <= 4) return "Term 1 (Jan–Apr)";
    if (month >= 5 && month <= 7) return "Term 2 (May–Jul)";
    if (month >= 9 && month <= 11) return "Term 3 (Sep–Nov)";
    return "Holiday Period";
  };

  const filteredScales = filterLevel ? scales.filter(s => s.level === filterLevel) : scales;

  const levelGroups = ["zjc", "o_level", "a_level"];

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">System Settings</h1>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="p-3 rounded-lg bg-primary/10 text-primary"><Calendar className="w-6 h-6" /></div>
              <div>
                <p className="text-lg font-bold">
                  {currentSession ? `${currentSession.academic_year} — ${termLabel(currentSession.term)}` : "No Active Session"}
                </p>
                <p className="text-sm text-muted-foreground">Auto-detected: {getAutoTerm()} | Year: {new Date().getFullYear()}</p>
                {currentSession && <p className="text-xs text-muted-foreground">{currentSession.start_date} to {currentSession.end_date}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="grading">
          <TabsList>
            <TabsTrigger value="grading">Grading Scales</TabsTrigger>
            <TabsTrigger value="sessions">Academic Sessions</TabsTrigger>
          </TabsList>

          <TabsContent value="grading">
            {/* Grading scales grouped by level */}
            <div className="space-y-6">
              {levelGroups.map(level => {
                const levelScales = scales.filter(s => s.level === level);
                return (
                  <Card key={level}>
                    <CardHeader>
                      <CardTitle className="text-lg">{level.replace("_", " ").toUpperCase()} Grading Scale</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Grade</TableHead><TableHead>Min Mark</TableHead><TableHead>Max Mark</TableHead>
                            <TableHead>Description</TableHead><TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {levelScales.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No scales configured</TableCell></TableRow>
                          ) : levelScales.map(s => (
                            <TableRow key={s.id}>
                              <TableCell className="font-bold text-lg">{s.grade_letter}</TableCell>
                              <TableCell>{s.min_mark}%</TableCell>
                              <TableCell>{s.max_mark}%</TableCell>
                              <TableCell className="text-muted-foreground">{s.description || "—"}</TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => { setEditScale({ ...s }); setEditScaleOpen(true); }}><Edit className="w-4 h-4" /></Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteScale(s.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })}

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Add Custom Scale</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={scaleLevel} onChange={e => setScaleLevel(e.target.value)}>
                    <option value="zjc">ZJC</option><option value="o_level">O Level</option><option value="a_level">A Level</option>
                  </select>
                  <Input placeholder="Grade (A, B...)" value={scaleLetter} onChange={e => setScaleLetter(e.target.value)} className="w-24" />
                  <Input placeholder="Min %" type="number" value={scaleMin} onChange={e => setScaleMin(e.target.value)} className="w-20" />
                  <Input placeholder="Max %" type="number" value={scaleMax} onChange={e => setScaleMax(e.target.value)} className="w-20" />
                  <Input placeholder="Description" value={scaleDesc} onChange={e => setScaleDesc(e.target.value)} className="flex-1 min-w-[150px]" />
                  <Button onClick={handleAddScale}><Plus className="w-4 h-4 mr-1" /> Add</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sessions">
            <Card>
              <CardHeader><CardTitle>Academic Sessions (2025–2035)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Year</TableHead><TableHead>Term</TableHead><TableHead>Start</TableHead>
                      <TableHead>End</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map(s => (
                      <TableRow key={s.id} className={s.is_current ? "bg-primary/5" : ""}>
                        <TableCell className="font-medium">{s.academic_year}</TableCell>
                        <TableCell>{termLabel(s.term)}</TableCell>
                        <TableCell>{s.start_date}</TableCell>
                        <TableCell>{s.end_date}</TableCell>
                        <TableCell>
                          {s.is_current ? (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Current</span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {!s.is_current && (
                              <Button variant="outline" size="sm" onClick={() => handleSetCurrent(s.id)}>
                                <CheckCircle className="w-4 h-4 mr-1" /> Set Current
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => { setEditSession({ ...s }); setEditOpen(true); }}><Edit className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Session Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Session Dates</DialogTitle></DialogHeader>
            {editSession && (
              <div className="space-y-3">
                <p className="text-sm font-medium">{editSession.academic_year} — {termLabel(editSession.term)}</p>
                <div><label className="text-sm text-muted-foreground">Start Date</label><Input type="date" value={editSession.start_date} onChange={e => setEditSession({ ...editSession, start_date: e.target.value })} /></div>
                <div><label className="text-sm text-muted-foreground">End Date</label><Input type="date" value={editSession.end_date} onChange={e => setEditSession({ ...editSession, end_date: e.target.value })} /></div>
                <Button className="w-full" onClick={handleEditSession}>Save Changes</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Scale Dialog */}
        <Dialog open={editScaleOpen} onOpenChange={setEditScaleOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Grading Scale</DialogTitle></DialogHeader>
            {editScale && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{editScale.level.replace("_", " ").toUpperCase()}</p>
                <Input placeholder="Grade Letter" value={editScale.grade_letter} onChange={e => setEditScale({ ...editScale, grade_letter: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <Input type="number" placeholder="Min %" value={editScale.min_mark} onChange={e => setEditScale({ ...editScale, min_mark: e.target.value })} />
                  <Input type="number" placeholder="Max %" value={editScale.max_mark} onChange={e => setEditScale({ ...editScale, max_mark: e.target.value })} />
                </div>
                <Input placeholder="Description" value={editScale.description || ""} onChange={e => setEditScale({ ...editScale, description: e.target.value })} />
                <Button className="w-full" onClick={handleEditScale}>Save Changes</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;

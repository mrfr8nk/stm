import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Calendar, CheckCircle, Edit, User, Save, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const AdminSettings = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [editSession, setEditSession] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Profile editing
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("phone").eq("user_id", user.id).single()
        .then(({ data }) => { if (data?.phone) setPhone(data.phone); });
    }
  }, [user]);

  const fetchSessions = async () => {
    const { data } = await supabase.from("academic_sessions").select("*").order("academic_year", { ascending: false }).order("term");
    const all = data || [];
    setSessions(all);
    setCurrentSession(all.find((s: any) => s.is_current) || null);
  };

  useEffect(() => { fetchSessions(); }, []);

  const handleSetCurrent = async (id: string) => {
    await supabase.from("academic_sessions").update({ is_current: false }).neq("id", "none");
    await supabase.from("academic_sessions").update({ is_current: true }).eq("id", id);
    toast({ title: "Current Session Updated" });
    fetchSessions();
  };

  const handleEditSession = async () => {
    if (!editSession) return;
    const { error } = await supabase.from("academic_sessions").update({
      start_date: editSession.start_date, end_date: editSession.end_date,
    }).eq("id", editSession.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Session Updated" }); setEditOpen(false); fetchSessions(); }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone }).eq("user_id", user.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile Updated" });
    setSaving(false);
  };

  const termLabel = (t: string) => t.replace("_", " ").toUpperCase();

  const getAutoTerm = () => {
    const month = new Date().getMonth() + 1;
    if (month >= 1 && month <= 4) return "Term 1 (Jan–Apr)";
    if (month >= 5 && month <= 7) return "Term 2 (May–Jul)";
    if (month >= 9 && month <= 11) return "Term 3 (Sep–Nov)";
    return "Holiday Period";
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Account Settings</h1>

        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                {(profile?.full_name || "A").charAt(0)}
              </div>
              <div>
                <p className="font-bold text-foreground">{profile?.full_name || "Admin"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Shield className="w-3 h-3 text-primary" />
                  <span className="text-xs font-medium text-primary">Administrator</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input value={user?.email || ""} disabled />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Phone</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+263..." />
              </div>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving}>
              <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Current Session */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="p-3 rounded-lg bg-primary/10 text-primary"><Calendar className="w-6 h-6" /></div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {currentSession ? `${currentSession.academic_year} — ${termLabel(currentSession.term)}` : "No Active Session"}
                </p>
                <p className="text-sm text-muted-foreground">Auto-detected: {getAutoTerm()} | Year: {new Date().getFullYear()}</p>
                {currentSession && <p className="text-xs text-muted-foreground">{currentSession.start_date} to {currentSession.end_date}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Academic Sessions */}
        <Card>
          <CardHeader><CardTitle>Academic Sessions</CardTitle></CardHeader>
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
                        <Button variant="ghost" size="sm" onClick={() => { setEditSession({ ...s }); setEditOpen(true); }}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;

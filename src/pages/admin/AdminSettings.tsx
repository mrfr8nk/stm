import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Calendar, CheckCircle, Edit, User, Save, Shield, Lock, Unlock, Download, Upload, AlertTriangle, Database } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import AvatarUpload from "@/components/AvatarUpload";
import ThemeToggle from "@/components/ThemeToggle";

const AdminSettings = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [editSession, setEditSession] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [reportsLocked, setReportsLocked] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);

  // Profile editing
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Backup/Restore
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) { setFullName(profile.full_name || ""); setAvatarUrl(profile.avatar_url || null); }
  }, [profile]);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("phone").eq("user_id", user.id).single()
        .then(({ data }) => { if (data?.phone) setPhone(data.phone); });
    }
  }, [user]);

  useEffect(() => {
    supabase.from("system_settings").select("*").eq("key", "reports_locked").single()
      .then(({ data }) => { if (data) setReportsLocked(data.value === "true"); });
  }, []);

  const toggleReportsLock = async () => {
    const newValue = !reportsLocked;
    const { error } = await supabase.from("system_settings").update({
      value: newValue ? "true" : "false",
      updated_at: new Date().toISOString(),
      updated_by: user?.id
    }).eq("key", "reports_locked");

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setReportsLocked(newValue);
      toast({ title: newValue ? "Reports Locked" : "Reports Unlocked" });
    }
  };

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

  // Backup
  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backup-restore`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action: "backup" }),
      });
      if (!resp.ok) throw new Error((await resp.json()).error || "Backup failed");
      const backupData = await resp.json();
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stmarys-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Backup Complete", description: `${Object.values(backupData.row_counts).reduce((a: number, b: any) => a + Number(b), 0)} rows exported.` });
    } catch (e: any) {
      toast({ title: "Backup Error", description: e.message, variant: "destructive" });
    }
    setBackingUp(false);
  };

  // Restore
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.tables) throw new Error("Invalid backup format");
        setPendingBackupData(data);
        setRestoreConfirmOpen(true);
      } catch {
        toast({ title: "Invalid File", description: "Could not parse backup file.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleRestore = async () => {
    if (!pendingBackupData) return;
    setRestoreConfirmOpen(false);
    setRestoring(true);
    setRestoreProgress(10);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setRestoreProgress(30);
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backup-restore`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action: "restore", backup_data: pendingBackupData }),
      });
      setRestoreProgress(80);
      if (!resp.ok) throw new Error((await resp.json()).error || "Restore failed");
      const result = await resp.json();
      setRestoreProgress(100);
      const totalRestored = Object.values(result.results).reduce((sum: number, r: any) => sum + (r.count || 0), 0);
      toast({ title: "Restore Complete", description: `${totalRestored} rows restored.` });
    } catch (e: any) {
      toast({ title: "Restore Error", description: e.message, variant: "destructive" });
    }
    setRestoring(false);
    setRestoreProgress(0);
    setPendingBackupData(null);
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
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              {user && (
                <AvatarUpload userId={user.id} currentUrl={avatarUrl} name={profile?.full_name || "A"} size="md" onUploaded={setAvatarUrl} />
              )}
              <div>
                <p className="font-bold text-foreground">{profile?.full_name || "Admin"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <div className="flex items-center gap-1 mt-1"><Shield className="w-3 h-3 text-primary" /><span className="text-xs font-medium text-primary">Administrator</span></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-foreground">Full Name</label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
              <div><label className="text-sm font-medium text-foreground">Email</label><Input value={user?.email || ""} disabled /></div>
              <div><label className="text-sm font-medium text-foreground">Phone</label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+263..." /></div>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving}><Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}</Button>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Appearance</p>
              <p className="text-sm text-muted-foreground">Toggle between light and dark mode</p>
            </div>
            <ThemeToggle />
          </CardContent>
        </Card>

        {/* Reports Lock Toggle */}
        <Card className={`border-l-4 ${reportsLocked ? "border-l-red-500" : "border-l-green-500"}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${reportsLocked ? "bg-red-500/10" : "bg-green-500/10"}`}>
                  {reportsLocked ? <Lock className="w-6 h-6 text-red-600" /> : <Unlock className="w-6 h-6 text-green-600" />}
                </div>
                <div>
                  <p className="font-bold text-foreground">Student Report Cards</p>
                  <p className="text-sm text-muted-foreground">
                    {reportsLocked
                      ? "Reports are LOCKED — Students cannot view report cards."
                      : "Reports are UNLOCKED — Students can view their report cards (if fees are cleared)."}
                  </p>
                </div>
              </div>
              <Switch checked={!reportsLocked} onCheckedChange={toggleReportsLock} />
            </div>
          </CardContent>
        </Card>

        {/* Backup & Restore */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Database className="w-5 h-5" /> Backup & Restore</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Create a full backup of all school data or restore from a previous backup file. Backups include all students, teachers, grades, attendance, fees, and system settings.
            </p>
            {restoring && (
              <div className="space-y-2">
                <Progress value={restoreProgress} className="h-2" />
                <p className="text-sm text-muted-foreground">Restoring data... {restoreProgress}%</p>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleBackup} disabled={backingUp || restoring} variant="default">
                <Download className="w-4 h-4 mr-2" /> {backingUp ? "Creating Backup..." : "Download Backup"}
              </Button>
              <Button onClick={() => fileInputRef.current?.click()} disabled={backingUp || restoring} variant="outline">
                <Upload className="w-4 h-4 mr-2" /> Restore from Backup
              </Button>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />
            </div>
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
                <TableRow><TableHead>Year</TableHead><TableHead>Term</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map(s => (
                  <TableRow key={s.id} className={s.is_current ? "bg-primary/5" : ""}>
                    <TableCell className="font-medium">{s.academic_year}</TableCell>
                    <TableCell>{termLabel(s.term)}</TableCell>
                    <TableCell>{s.start_date}</TableCell>
                    <TableCell>{s.end_date}</TableCell>
                    <TableCell>
                      {s.is_current ? <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Current</span> : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!s.is_current && <Button variant="outline" size="sm" onClick={() => handleSetCurrent(s.id)}><CheckCircle className="w-4 h-4 mr-1" /> Set Current</Button>}
                        <Button variant="ghost" size="sm" onClick={() => { setEditSession({ ...s }); setEditOpen(true); }}><Edit className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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

        {/* Restore Confirm Dialog */}
        <Dialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-5 h-5" /> Confirm Restore</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong>Warning:</strong> Restoring will replace ALL existing data with the backup data. This action cannot be undone.
              </p>
              {pendingBackupData && (
                <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                  <p><strong>Backup Date:</strong> {new Date(pendingBackupData.created_at).toLocaleString()}</p>
                  <p><strong>Created By:</strong> {pendingBackupData.created_by}</p>
                  <p><strong>Total Rows:</strong> {String(Object.values(pendingBackupData.row_counts || {}).reduce((a: number, b: any) => a + Number(b), 0))}</p>
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setRestoreConfirmOpen(false)}>Cancel</Button>
                <Button variant="destructive" className="flex-1" onClick={handleRestore}>
                  <Upload className="w-4 h-4 mr-2" /> Restore Now
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;

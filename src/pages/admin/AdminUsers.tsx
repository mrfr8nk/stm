import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, GraduationCap, BookOpen, Shield, Trash2, Eye, ArrowUpDown, Mail, Phone, Save, Edit, UserX, UserCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const AdminUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [studentProfiles, setStudentProfiles] = useState<any[]>([]);
  const [teacherProfiles, setTeacherProfiles] = useState<any[]>([]);
  const [sortField, setSortField] = useState<string>("full_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingSP, setEditingSP] = useState(false);
  const [spForm, setSpForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [profilesRes, rolesRes, studentRes, teacherRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*"),
      supabase.from("student_profiles").select("*"),
      supabase.from("teacher_profiles").select("*"),
    ]);
    const roleMap: Record<string, string> = {};
    (rolesRes.data || []).forEach((r: any) => { roleMap[r.user_id] = r.role; });
    const spMap: Record<string, any> = {};
    (studentRes.data || []).forEach((s: any) => { spMap[s.user_id] = s; });
    setUsers((profilesRes.data || []).map((p: any) => ({ ...p, role: roleMap[p.user_id] || "unassigned", studentProfile: spMap[p.user_id] || null })));
    setStudentProfiles(studentRes.data || []);
    setStudentProfiles(studentRes.data || []);
    setTeacherProfiles(teacherRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName}?`)) return;
    await Promise.all([
      supabase.from("user_roles").delete().eq("user_id", userId),
      supabase.from("student_profiles").delete().eq("user_id", userId),
      supabase.from("teacher_profiles").delete().eq("user_id", userId),
    ]);
    toast({ title: "User Removed" });
    fetchData();
  };

  const viewDetails = (user: any) => {
    const sp = studentProfiles.find((s: any) => s.user_id === user.user_id);
    const tp = teacherProfiles.find((t: any) => t.user_id === user.user_id);
    setSelectedUser({ ...user, studentProfile: sp, teacherProfile: tp });
    if (sp) {
      setSpForm({
        national_id: sp.national_id || "", birth_cert_number: sp.birth_cert_number || "",
        date_of_birth: sp.date_of_birth || "", guardian_name: sp.guardian_name || "",
        guardian_phone: sp.guardian_phone || "", guardian_email: sp.guardian_email || "",
        address: sp.address || "", emergency_contact: sp.emergency_contact || "",
        emergency_phone: sp.emergency_phone || "", blood_type: sp.blood_type || "",
        allergies: sp.allergies || "", medical_conditions: sp.medical_conditions || "",
      });
    }
    setEditingSP(false);
    setDetailOpen(true);
  };

  const handleSaveStudentProfile = async () => {
    if (!selectedUser?.studentProfile) return;
    setSaving(true);
    const { error } = await supabase.from("student_profiles").update(spForm).eq("user_id", selectedUser.user_id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Student Profile Updated" });
      setEditingSP(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleTransferStudent = async (userId: string, currentlyActive: boolean) => {
    const action = currentlyActive ? "transfer (deactivate)" : "reactivate";
    if (!confirm(`Are you sure you want to ${action} this student?`)) return;
    const { error } = await supabase.from("student_profiles").update({ is_active: !currentlyActive }).eq("user_id", userId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: currentlyActive ? "Student Transferred" : "Student Reactivated", description: currentlyActive ? "Student has been marked as transferred and deactivated." : "Student has been reactivated." });
      fetchData();
      setDetailOpen(false);
    }
  };

  const sorted = (list: any[]) => {
    return [...list].sort((a, b) => {
      const aVal = (a[sortField] || "").toString().toLowerCase();
      const bVal = (b[sortField] || "").toString().toLowerCase();
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  };

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const filterByRole = (role: string) => users.filter(u => u.role === role && ((u.full_name || "").toLowerCase().includes(search.toLowerCase()) || (u.email || "").toLowerCase().includes(search.toLowerCase())));
  const allFiltered = users.filter(u => (u.full_name || "").toLowerCase().includes(search.toLowerCase()) || (u.email || "").toLowerCase().includes(search.toLowerCase()));

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = { admin: "bg-primary text-primary-foreground", teacher: "bg-secondary text-secondary-foreground", student: "bg-accent text-accent-foreground" };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role] || "bg-muted text-muted-foreground"}`}>{role}</span>;
  };

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(field)}>
      <span className="flex items-center gap-1">{children} <ArrowUpDown className="w-3 h-3 text-muted-foreground" /></span>
    </TableHead>
  );

  const UserTable = ({ data, showRole = true }: { data: any[]; showRole?: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <SortHeader field="full_name">Name</SortHeader>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          {showRole && <TableHead>Role</TableHead>}
          <SortHeader field="created_at">Joined</SortHeader>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
        ) : sorted(data).length === 0 ? (
          <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users found.</TableCell></TableRow>
        ) : sorted(data).map(u => (
          <TableRow key={u.id} className={u.studentProfile?.is_active === false ? "opacity-50 bg-destructive/5" : ""}>
            <TableCell className="font-medium">
              {u.full_name}
              {u.studentProfile?.is_active === false && <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-destructive/10 text-destructive font-medium">TRANSFERRED</span>}
            </TableCell>
            <TableCell className="text-sm">{u.email}</TableCell>
            <TableCell className="text-sm">{u.phone || "—"}</TableCell>
            {showRole && <TableCell>{roleBadge(u.role)}</TableCell>}
            <TableCell className="text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => viewDetails(u)}><Eye className="w-4 h-4" /></Button>
                {u.role !== "admin" && <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(u.user_id, u.full_name)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const stats = { total: users.length, admins: users.filter(u => u.role === "admin").length, teachers: users.filter(u => u.role === "teacher").length, students: users.filter(u => u.role === "student").length };

  const spField = (label: string, key: string, type = "text") => (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input className="h-8 text-sm" type={type} value={editingSP ? spForm[key] : (selectedUser?.studentProfile?.[key] || "—")} disabled={!editingSP}
        onChange={e => setSpForm({ ...spForm, [key]: e.target.value })} />
    </div>
  );

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div><h1 className="font-display text-2xl font-bold text-foreground">User Management</h1><p className="text-muted-foreground text-sm">Manage all system users</p></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: stats.total, icon: Users, color: "text-primary" },
            { label: "Administrators", value: stats.admins, icon: Shield, color: "text-destructive" },
            { label: "Teachers", value: stats.teachers, icon: BookOpen, color: "text-secondary" },
            { label: "Students", value: stats.students, icon: GraduationCap, color: "text-accent" },
          ].map(s => (
            <Card key={s.label}><CardContent className="flex items-center gap-3 p-4">
              <div className={`p-2 rounded-lg bg-muted ${s.color}`}><s.icon className="w-5 h-5" /></div>
              <div><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            </CardContent></Card>
          ))}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Users ({stats.total})</TabsTrigger>
            <TabsTrigger value="teachers">Teachers ({stats.teachers})</TabsTrigger>
            <TabsTrigger value="students">Students ({stats.students})</TabsTrigger>
            <TabsTrigger value="admins">Admins ({stats.admins})</TabsTrigger>
          </TabsList>
          <TabsContent value="all"><Card><CardContent className="p-0"><UserTable data={allFiltered} /></CardContent></Card></TabsContent>
          <TabsContent value="teachers"><Card><CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" /> Teachers</CardTitle></CardHeader><CardContent className="p-0"><UserTable data={filterByRole("teacher")} showRole={false} /></CardContent></Card></TabsContent>
          <TabsContent value="students"><Card><CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5" /> Students</CardTitle></CardHeader><CardContent className="p-0"><UserTable data={filterByRole("student")} showRole={false} /></CardContent></Card></TabsContent>
          <TabsContent value="admins"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Administrators</CardTitle></CardHeader><CardContent className="p-0"><UserTable data={filterByRole("admin")} showRole={false} /></CardContent></Card></TabsContent>
        </Tabs>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>User Details</DialogTitle></DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold">
                    {(selectedUser.full_name || "U").charAt(0)}
                  </div>
                  <div>
                    <p className="text-lg font-bold">{selectedUser.full_name}</p>
                    {roleBadge(selectedUser.role)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /> {selectedUser.email || "—"}</div>
                  <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /> {selectedUser.phone || "—"}</div>
                  <div><span className="text-muted-foreground">Joined:</span> {new Date(selectedUser.created_at).toLocaleDateString()}</div>
                </div>

                {selectedUser.studentProfile && (
                  <>
                    {/* Transfer/Status Banner */}
                    <div className={`flex items-center justify-between p-3 rounded-lg border ${selectedUser.studentProfile.is_active === false ? "bg-destructive/5 border-destructive/20" : "bg-green-500/5 border-green-500/20"}`}>
                      <div className="flex items-center gap-2">
                        {selectedUser.studentProfile.is_active === false ? (
                          <><UserX className="w-5 h-5 text-destructive" /><div><p className="font-medium text-destructive">Transferred / Deactivated</p><p className="text-xs text-muted-foreground">This student is no longer active</p></div></>
                        ) : (
                          <><UserCheck className="w-5 h-5 text-green-600" /><div><p className="font-medium text-green-700">Active Student</p><p className="text-xs text-muted-foreground">Student ID: <span className="font-mono font-semibold">{selectedUser.studentProfile.student_id || "—"}</span></p></div></>
                        )}
                      </div>
                      <Button
                        variant={selectedUser.studentProfile.is_active === false ? "outline" : "destructive"}
                        size="sm"
                        onClick={() => handleTransferStudent(selectedUser.user_id, selectedUser.studentProfile.is_active !== false)}
                      >
                        {selectedUser.studentProfile.is_active === false ? <><UserCheck className="w-4 h-4 mr-1" /> Reactivate</> : <><UserX className="w-4 h-4 mr-1" /> Transfer</>}
                      </Button>
                    </div>

                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> Identity & Guardian</CardTitle>
                          <Button variant="ghost" size="sm" onClick={() => setEditingSP(!editingSP)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                          {spField("Student ID", "student_id")}
                          {spField("Form", "form")}
                          {spField("National ID", "national_id")}
                          {spField("Birth Cert No.", "birth_cert_number")}
                          {spField("Date of Birth", "date_of_birth", editingSP ? "date" : "text")}
                          {spField("Guardian Name", "guardian_name")}
                          {spField("Guardian Phone", "guardian_phone")}
                          {spField("Guardian Email", "guardian_email")}
                          {spField("Address", "address")}
                          {spField("Emergency Contact", "emergency_contact")}
                          {spField("Emergency Phone", "emergency_phone")}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader><CardTitle className="text-sm flex items-center gap-2">❤️ Medical Information</CardTitle></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                          {spField("Blood Type", "blood_type")}
                          {spField("Allergies", "allergies")}
                          <div className="col-span-2">{spField("Medical Conditions", "medical_conditions")}</div>
                        </div>
                      </CardContent>
                    </Card>
                    {editingSP && (
                      <Button className="w-full" onClick={handleSaveStudentProfile} disabled={saving}>
                        <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Student Records"}
                      </Button>
                    )}
                  </>
                )}

                {selectedUser.teacherProfile && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Teacher Profile</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Employee ID:</span> {selectedUser.teacherProfile.employee_id || "—"}</p>
                      <p><span className="text-muted-foreground">Department:</span> {selectedUser.teacherProfile.department || "—"}</p>
                      <p><span className="text-muted-foreground">Qualification:</span> {selectedUser.teacherProfile.qualification || "—"}</p>
                      <p><span className="text-muted-foreground">Subjects:</span> {(selectedUser.teacherProfile.subjects_taught || []).join(", ") || "—"}</p>
                      <p><span className="text-muted-foreground">Date Joined:</span> {selectedUser.teacherProfile.date_joined || "—"}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminUsers;

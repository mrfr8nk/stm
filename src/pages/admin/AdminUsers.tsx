import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Users, Search, GraduationCap, BookOpen, Shield, Trash2, Eye, ArrowUpDown, Mail, Phone } from "lucide-react";
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
    setUsers((profilesRes.data || []).map((p: any) => ({ ...p, role: roleMap[p.user_id] || "unassigned" })));
    setStudentProfiles(studentRes.data || []);
    setTeacherProfiles(teacherRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName}? This will delete their role and profile data.`)) return;
    await Promise.all([
      supabase.from("user_roles").delete().eq("user_id", userId),
      supabase.from("student_profiles").delete().eq("user_id", userId),
      supabase.from("teacher_profiles").delete().eq("user_id", userId),
    ]);
    toast({ title: "User Removed", description: `${userName}'s role and profile data has been removed.` });
    fetchData();
  };

  const viewDetails = (user: any) => {
    const sp = studentProfiles.find((s: any) => s.user_id === user.user_id);
    const tp = teacherProfiles.find((t: any) => t.user_id === user.user_id);
    setSelectedUser({ ...user, studentProfile: sp, teacherProfile: tp });
    setDetailOpen(true);
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

  const filterByRole = (role: string) => {
    return users.filter(u => u.role === role && (
      (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(search.toLowerCase())
    ));
  };

  const allFiltered = users.filter(u =>
    (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-primary text-primary-foreground",
      teacher: "bg-secondary text-secondary-foreground",
      student: "bg-accent text-accent-foreground",
    };
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
        ) : (
          sorted(data).map(u => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.full_name}</TableCell>
              <TableCell className="text-sm">{u.email}</TableCell>
              <TableCell className="text-sm">{u.phone || "—"}</TableCell>
              {showRole && <TableCell>{roleBadge(u.role)}</TableCell>}
              <TableCell className="text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => viewDetails(u)}><Eye className="w-4 h-4" /></Button>
                  {u.role !== "admin" && (
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(u.user_id, u.full_name)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === "admin").length,
    teachers: users.filter(u => u.role === "teacher").length,
    students: users.filter(u => u.role === "student").length,
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-muted-foreground text-sm">Manage all system users</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: stats.total, icon: Users, color: "text-primary" },
            { label: "Administrators", value: stats.admins, icon: Shield, color: "text-destructive" },
            { label: "Teachers", value: stats.teachers, icon: BookOpen, color: "text-secondary" },
            { label: "Students", value: stats.students, icon: GraduationCap, color: "text-accent" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`p-2 rounded-lg bg-muted ${s.color}`}><s.icon className="w-5 h-5" /></div>
                <div><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All Users ({stats.total})</TabsTrigger>
            <TabsTrigger value="teachers">Teachers ({stats.teachers})</TabsTrigger>
            <TabsTrigger value="students">Students ({stats.students})</TabsTrigger>
            <TabsTrigger value="admins">Admins ({stats.admins})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card><CardContent className="p-0"><UserTable data={allFiltered} /></CardContent></Card>
          </TabsContent>
          <TabsContent value="teachers">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" /> Teachers</CardTitle></CardHeader>
              <CardContent className="p-0"><UserTable data={filterByRole("teacher")} showRole={false} /></CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="students">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5" /> Students</CardTitle></CardHeader>
              <CardContent className="p-0"><UserTable data={filterByRole("student")} showRole={false} /></CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="admins">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Administrators</CardTitle></CardHeader>
              <CardContent className="p-0"><UserTable data={filterByRole("admin")} showRole={false} /></CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg">
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
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Student Profile</CardTitle></CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p><span className="text-muted-foreground">Student ID:</span> {selectedUser.studentProfile.student_id || "—"}</p>
                      <p><span className="text-muted-foreground">Form:</span> {selectedUser.studentProfile.form}</p>
                      <p><span className="text-muted-foreground">Level:</span> {selectedUser.studentProfile.level?.replace("_", " ").toUpperCase()}</p>
                      <p><span className="text-muted-foreground">Guardian:</span> {selectedUser.studentProfile.guardian_name || "—"}</p>
                      <p><span className="text-muted-foreground">Guardian Phone:</span> {selectedUser.studentProfile.guardian_phone || "—"}</p>
                      <p><span className="text-muted-foreground">Active:</span> {selectedUser.studentProfile.is_active ? "Yes" : "No"}</p>
                    </CardContent>
                  </Card>
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

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import ExportDropdown from "@/components/ExportDropdown";
import {
  Users, Search, GraduationCap, Eye, ArrowUpDown, Mail, Phone, Save, Edit,
  UserX, UserCheck, Trash2, MapPin, Calendar, CreditCard, Heart, AlertTriangle,
  Droplets, Shield, BookOpen, ClipboardCheck, Download
} from "lucide-react";

type SortField = "full_name" | "student_id" | "form" | "class_name" | "guardian_name";

const AdminStudents = () => {
  const { toast } = useToast();
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [sortField, setSortField] = useState<SortField>("full_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [studentGrades, setStudentGrades] = useState<any[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<any[]>([]);
  const [studentFees, setStudentFees] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    const [spRes, classesRes, profilesRes] = await Promise.all([
      supabase.from("student_profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("classes").select("*").is("deleted_at", null).order("form").order("name"),
      supabase.from("profiles").select("user_id, full_name, email, phone, avatar_url, is_banned"),
    ]);

    const profileMap: Record<string, any> = {};
    (profilesRes.data || []).forEach(p => { profileMap[p.user_id] = p; });

    const classMap: Record<string, any> = {};
    (classesRes.data || []).forEach(c => { classMap[c.id] = c; });

    const merged = (spRes.data || []).map(sp => ({
      ...sp,
      profile: profileMap[sp.user_id] || null,
      class: classMap[sp.class_id] || null,
    }));

    setStudents(merged);
    setClasses(classesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const filtered = students
    .filter(s => {
      if (statusFilter === "active" && s.is_active === false) return false;
      if (statusFilter === "inactive" && s.is_active !== false) return false;
      if (statusFilter === "graduated" && s.graduation_status !== "graduated") return false;
      if (statusFilter !== "graduated" && s.graduation_status === "graduated") return false;
      if (classFilter !== "all" && s.class_id !== classFilter) return false;
      const q = search.toLowerCase();
      if (q && !(
        (s.profile?.full_name || "").toLowerCase().includes(q) ||
        (s.student_id || "").toLowerCase().includes(q) ||
        (s.guardian_name || "").toLowerCase().includes(q) ||
        (s.profile?.email || "").toLowerCase().includes(q)
      )) return false;
      return true;
    })
    .sort((a, b) => {
      let aV = "", bV = "";
      if (sortField === "full_name") { aV = a.profile?.full_name || ""; bV = b.profile?.full_name || ""; }
      else if (sortField === "student_id") { aV = a.student_id || ""; bV = b.student_id || ""; }
      else if (sortField === "form") { aV = String(a.form); bV = String(b.form); }
      else if (sortField === "class_name") { aV = a.class?.name || ""; bV = b.class?.name || ""; }
      else if (sortField === "guardian_name") { aV = a.guardian_name || ""; bV = b.guardian_name || ""; }
      return sortDir === "asc" ? aV.localeCompare(bV) : bV.localeCompare(aV);
    });

  const openDetail = async (student: any) => {
    setSelectedStudent(student);
    setEditForm({
      national_id: student.national_id || "", birth_cert_number: student.birth_cert_number || "",
      date_of_birth: student.date_of_birth || "", guardian_name: student.guardian_name || "",
      guardian_phone: student.guardian_phone || "", guardian_email: student.guardian_email || "",
      address: student.address || "", emergency_contact: student.emergency_contact || "",
      emergency_phone: student.emergency_phone || "", blood_type: student.blood_type || "",
      allergies: student.allergies || "", medical_conditions: student.medical_conditions || "",
      gender: student.gender || "", class_id: student.class_id || "", form: student.form,
      level: student.level,
    });
    setEditing(false);
    setDetailOpen(true);

    const [gradesRes, attRes, feesRes] = await Promise.all([
      supabase.from("grades").select("*, subjects(name)").eq("student_id", student.user_id).is("deleted_at", null).order("created_at", { ascending: false }),
      supabase.from("attendance").select("*").eq("student_id", student.user_id).order("date", { ascending: false }).limit(30),
      supabase.from("fee_records").select("*").eq("student_id", student.user_id).is("deleted_at", null).order("created_at", { ascending: false }),
    ]);
    setStudentGrades(gradesRes.data || []);
    setStudentAttendance(attRes.data || []);
    setStudentFees(feesRes.data || []);
  };

  const handleSave = async () => {
    if (!selectedStudent) return;
    setSaving(true);
    const { error } = await supabase.from("student_profiles").update(editForm).eq("user_id", selectedStudent.user_id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Student Updated" }); setEditing(false); fetchData(); }
    setSaving(false);
  };

  const handleToggleActive = async (userId: string, currentlyActive: boolean) => {
    if (!confirm(`${currentlyActive ? "Deactivate" : "Reactivate"} this student?`)) return;
    await supabase.from("student_profiles").update({ is_active: !currentlyActive }).eq("user_id", userId);
    toast({ title: currentlyActive ? "Student Deactivated" : "Student Reactivated" });
    fetchData(); setDetailOpen(false);
  };

  const handleBatchDeactivate = async () => {
    const ids = [...selectedIds];
    if (!confirm(`Deactivate ${ids.length} student(s)?`)) return;
    await Promise.all(ids.map(uid => supabase.from("student_profiles").update({ is_active: false }).eq("user_id", uid)));
    toast({ title: `${ids.length} students deactivated` });
    setSelectedIds(new Set()); fetchData();
  };

  const handleChangeClass = async (userId: string, newClassId: string) => {
    const cls = classes.find(c => c.id === newClassId);
    if (!cls) return;
    await supabase.from("student_profiles").update({ class_id: newClassId, form: cls.form, level: cls.level }).eq("user_id", userId);
    toast({ title: "Class Changed" });
    fetchData();
  };

  const toggleSelect = (uid: string) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(uid)) n.delete(uid); else n.add(uid); return n; });
  };

  const toggleSelectAll = () => {
    const ids = filtered.map(s => s.user_id);
    const allSel = ids.every(id => selectedIds.has(id));
    if (allSel) setSelectedIds(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
    else setSelectedIds(prev => { const n = new Set(prev); ids.forEach(id => n.add(id)); return n; });
  };

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(field)}>
      <span className="flex items-center gap-1">{children} <ArrowUpDown className={`w-3 h-3 ${sortField === field ? "text-primary" : "text-muted-foreground"}`} /></span>
    </TableHead>
  );

  const stats = {
    total: students.filter(s => s.graduation_status !== "graduated").length,
    active: students.filter(s => s.is_active !== false && s.graduation_status !== "graduated").length,
    inactive: students.filter(s => s.is_active === false && s.graduation_status !== "graduated").length,
    graduated: students.filter(s => s.graduation_status === "graduated").length,
  };

  const field = (label: string, key: string, type = "text") => (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input className="h-8 text-sm" type={type} disabled={!editing}
        value={editing ? editForm[key] || "" : (selectedStudent?.[key] || "—")}
        onChange={e => setEditForm({ ...editForm, [key]: e.target.value })} />
    </div>
  );

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Student Management</h1>
            <p className="text-muted-foreground text-sm">Manage all student records and profiles</p>
          </div>
          <ExportDropdown
            title="Student Directory"
            filename="students_list"
            headers={["Name", "Student ID", "Class", "Form", "Level", "Guardian", "Guardian Phone", "Email", "Status"]}
            rows={filtered.map(s => [
              s.profile?.full_name || "", s.student_id || "", s.class?.name || "", `Form ${s.form}`,
              s.level?.replace("_", " ").toUpperCase(), s.guardian_name || "", s.guardian_phone || "",
              s.profile?.email || "", s.is_active === false ? "Inactive" : "Active",
            ])}
            disabled={filtered.length === 0}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Students", value: stats.total, icon: Users, color: "text-primary" },
            { label: "Active", value: stats.active, icon: UserCheck, color: "text-green-600" },
            { label: "Inactive", value: stats.inactive, icon: UserX, color: "text-destructive" },
            { label: "Graduated", value: stats.graduated, icon: GraduationCap, color: "text-accent" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`p-2 rounded-lg bg-muted ${s.color}`}><s.icon className="w-5 h-5" /></div>
                <div><p className="text-xl font-bold">{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name, ID, guardian..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-48"><SelectValue placeholder="All Classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} (Form {c.form})</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="graduated">Graduated</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">{selectedIds.size} selected</span>
              <Button variant="outline" size="sm" onClick={handleBatchDeactivate}>
                <UserX className="w-4 h-4 mr-1" /> Deactivate
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
            </div>
          )}
        </div>

        {/* Student Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={filtered.length > 0 && filtered.every(s => selectedIds.has(s.user_id))} onCheckedChange={toggleSelectAll} />
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                  <SortHeader field="full_name">Name</SortHeader>
                  <SortHeader field="student_id">Student ID</SortHeader>
                  <SortHeader field="class_name">Class</SortHeader>
                  <SortHeader field="form">Form</SortHeader>
                  <TableHead>Level</TableHead>
                  <SortHeader field="guardian_name">Guardian</SortHeader>
                  <TableHead>Phone</TableHead>
                  <TableHead>Medical</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={12} className="text-center py-8 text-muted-foreground">No students found.</TableCell></TableRow>
                ) : filtered.map(s => (
                  <TableRow key={s.id} className={`${s.is_active === false ? "opacity-50 bg-destructive/5" : ""} ${selectedIds.has(s.user_id) ? "bg-primary/5" : ""}`}>
                    <TableCell><Checkbox checked={selectedIds.has(s.user_id)} onCheckedChange={() => toggleSelect(s.user_id)} /></TableCell>
                    <TableCell>
                      {s.profile?.avatar_url ? (
                        <img src={s.profile.avatar_url} className="w-8 h-8 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                          {(s.profile?.full_name || "S").charAt(0)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{s.profile?.full_name || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="font-mono text-xs">{s.student_id || "—"}</Badge></TableCell>
                    <TableCell className="text-sm">{s.class?.name || "Unassigned"}</TableCell>
                    <TableCell className="text-sm">Form {s.form}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{s.level?.replace("_", " ").toUpperCase()}</Badge></TableCell>
                    <TableCell className="text-sm">{s.guardian_name || "—"}</TableCell>
                    <TableCell className="text-sm">{s.guardian_phone || "—"}</TableCell>
                    <TableCell>
                      {(s.allergies || s.medical_conditions) ? (
                        <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="w-3 h-3 mr-1" />Alert</Badge>
                      ) : <span className="text-xs text-muted-foreground">None</span>}
                    </TableCell>
                    <TableCell>
                      {s.is_active === false ? (
                        <Badge variant="destructive" className="text-[10px]">Inactive</Badge>
                      ) : s.profile?.is_banned ? (
                        <Badge variant="destructive" className="text-[10px]">Banned</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-green-600 border-green-500">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openDetail(s)}><Eye className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" /> Student Records
              </DialogTitle>
            </DialogHeader>
            {selectedStudent && (
              <Tabs defaultValue="personal" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="personal">Personal</TabsTrigger>
                  <TabsTrigger value="academic">Academic</TabsTrigger>
                  <TabsTrigger value="attendance">Attendance</TabsTrigger>
                  <TabsTrigger value="fees">Fees</TabsTrigger>
                  <TabsTrigger value="medical">Medical</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                        {(selectedStudent.profile?.full_name || "S").charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-lg">{selectedStudent.profile?.full_name || "—"}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge>{selectedStudent.level?.replace("_", " ").toUpperCase()}</Badge>
                          <Badge variant="outline">Form {selectedStudent.form}</Badge>
                          <Badge variant="outline">{selectedStudent.class?.name || "No Class"}</Badge>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Status actions */}
                  <div className={`flex items-center justify-between p-3 rounded-lg border ${selectedStudent.is_active === false ? "bg-destructive/5 border-destructive/20" : "bg-green-500/5 border-green-500/20"}`}>
                    <div className="flex items-center gap-2">
                      {selectedStudent.is_active === false ? (
                        <><UserX className="w-5 h-5 text-destructive" /><p className="text-sm font-medium text-destructive">Deactivated</p></>
                      ) : (
                        <><UserCheck className="w-5 h-5 text-green-600" /><p className="text-sm font-medium text-green-700">Active — {selectedStudent.student_id}</p></>
                      )}
                    </div>
                    <Button variant={selectedStudent.is_active === false ? "outline" : "destructive"} size="sm"
                      onClick={() => handleToggleActive(selectedStudent.user_id, selectedStudent.is_active !== false)}>
                      {selectedStudent.is_active === false ? "Reactivate" : "Deactivate"}
                    </Button>
                  </div>

                  {/* Class change */}
                  {editing && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Change Class</label>
                      <Select value={editForm.class_id || ""} onValueChange={v => handleChangeClass(selectedStudent.user_id, v)}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Select class" /></SelectTrigger>
                        <SelectContent>
                          {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name} (Form {c.form})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {field("Student ID", "student_id")}
                    {field("Date of Birth", "date_of_birth", editing ? "date" : "text")}
                    {field("National ID", "national_id")}
                    {field("Birth Cert No.", "birth_cert_number")}
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Sex</label>
                      <select className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm h-8" disabled={!editing}
                        value={editing ? editForm.gender : (selectedStudent.gender || "")}
                        onChange={e => setEditForm({ ...editForm, gender: e.target.value })}>
                        <option value="">—</option><option value="male">Male</option><option value="female">Female</option>
                      </select>
                    </div>
                    {field("Address", "address")}
                  </div>

                  <div className="border-t border-border pt-3">
                    <p className="text-sm font-bold text-foreground mb-2">Guardian Information</p>
                    <div className="grid grid-cols-2 gap-3">
                      {field("Guardian Name", "guardian_name")}
                      {field("Guardian Phone", "guardian_phone")}
                      {field("Guardian Email", "guardian_email")}
                      {field("Emergency Contact", "emergency_contact")}
                      {field("Emergency Phone", "emergency_phone")}
                    </div>
                  </div>

                  {editing && (
                    <Button className="w-full" onClick={handleSave} disabled={saving}>
                      <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </TabsContent>

                <TabsContent value="academic" className="space-y-3 mt-4">
                  <p className="text-sm font-bold text-foreground">Grades ({studentGrades.length})</p>
                  {studentGrades.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4">No grades recorded.</p>
                  ) : (
                    <div className="space-y-1">
                      {studentGrades.map(g => (
                        <div key={g.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <span className="text-sm font-medium">{g.subjects?.name || "Subject"}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${Number(g.mark) >= 75 ? "text-green-600" : Number(g.mark) >= 50 ? "text-yellow-600" : "text-red-600"}`}>{g.mark}%</span>
                            <Badge variant="outline" className="text-[10px]">{g.grade_letter || "—"}</Badge>
                            <span className="text-xs text-muted-foreground">{g.term?.replace("_", " ")}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="attendance" className="space-y-3 mt-4">
                  <p className="text-sm font-bold text-foreground">Recent Attendance ({studentAttendance.length})</p>
                  {studentAttendance.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4">No attendance records.</p>
                  ) : (
                    <div className="space-y-1">
                      {studentAttendance.map(a => {
                        const colors: Record<string, string> = {
                          present: "bg-green-500/15 text-green-700 border-green-500",
                          absent: "bg-red-500/15 text-red-700 border-red-500",
                          late: "bg-yellow-500/15 text-yellow-700 border-yellow-500",
                          excused: "bg-blue-500/15 text-blue-700 border-blue-500",
                        };
                        return (
                          <div key={a.id} className={`flex items-center justify-between p-2 rounded border-l-4 ${colors[a.status] || ""}`}>
                            <span className="text-sm">{a.date}</span>
                            <Badge variant="outline" className="text-xs capitalize">{a.status}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="fees" className="space-y-3 mt-4">
                  <p className="text-sm font-bold text-foreground">Fee Records ({studentFees.length})</p>
                  {studentFees.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4">No fee records.</p>
                  ) : (
                    <div className="space-y-1">
                      {studentFees.map(f => (
                        <div key={f.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                          <div>
                            <span className="text-sm font-medium">{f.term?.replace("_", " ")}</span>
                            <span className="text-xs text-muted-foreground ml-2">{f.academic_year}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm">Paid: <strong>${Number(f.amount_paid).toFixed(2)}</strong></span>
                            <span className="text-sm text-muted-foreground">/ ${Number(f.amount_due).toFixed(2)}</span>
                            {Number(f.amount_paid) >= Number(f.amount_due) ? (
                              <Badge variant="outline" className="text-green-600 text-[10px]">Paid</Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px]">Owing</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="medical" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-start gap-2"><Droplets className="w-4 h-4 text-muted-foreground mt-0.5" /><div><p className="text-xs text-muted-foreground">Blood Type</p><p className="text-sm font-medium">{selectedStudent.blood_type || "—"}</p></div></div>
                    <div className="flex items-start gap-2"><Heart className="w-4 h-4 text-muted-foreground mt-0.5" /><div><p className="text-xs text-muted-foreground">Allergies</p><p className="text-sm font-medium">{selectedStudent.allergies || "—"}</p></div></div>
                  </div>
                  {selectedStudent.medical_conditions && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <p className="text-sm font-bold text-red-700">Medical Conditions</p>
                      </div>
                      <p className="text-sm">{selectedStudent.medical_conditions}</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminStudents;

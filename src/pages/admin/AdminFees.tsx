import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, RotateCcw, FileDown, BarChart3, UserSearch, BookOpen, ClipboardCheck, DollarSign, Heart, Shield, X, ScanLine, GraduationCap, Plus, Trash2, Calendar } from "lucide-react";
import BarcodeScanner from "@/components/admin/fees/BarcodeScanner";

import FeeStructureCard from "@/components/admin/fees/FeeStructureCard";
import FeeStatsCards from "@/components/admin/fees/FeeStatsCards";
import AddFeeForm from "@/components/admin/fees/AddFeeForm";
import FeeRecordsTable from "@/components/admin/fees/FeeRecordsTable";
import FeeCharts from "@/components/admin/fees/FeeCharts";
import PaymentDialog from "@/components/admin/fees/PaymentDialog";
import { DEFAULT_FEE_STRUCTURE, DEFAULT_ZIG_RATE, PAYMENT_METHODS, methodLabel } from "@/components/admin/fees/FeeConstants";
import { printReceipt, generateCSVReport } from "@/components/admin/fees/ReceiptPrinter";

const AdminFees = () => {
  const { toast } = useToast();
  const [feeRecords, setFeeRecords] = useState<any[]>([]);
  const [deletedFees, setDeletedFees] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterTerm, setFilterTerm] = useState("");
  const [zigRate, setZigRate] = useState(DEFAULT_ZIG_RATE);
  const [feeStructure, setFeeStructure] = useState(DEFAULT_FEE_STRUCTURE);
  const [showCharts, setShowCharts] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Scholarships
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [scholarshipSearch, setScholarshipSearch] = useState("");
  const [scholarshipStudentSearch, setScholarshipStudentSearch] = useState("");
  const [scholarshipForm, setScholarshipForm] = useState({ student_id: "", organization_name: "", coverage_type: "full", coverage_percentage: "100", end_date: "", notes: "" });
  // Payment dialog
  const [payRecord, setPayRecord] = useState<any>(null);
  const [payOpen, setPayOpen] = useState(false);

  // Edit dialog
  const [editFee, setEditFee] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Master student lookup
  const [masterSearch, setMasterSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [studentGrades, setStudentGrades] = useState<any[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<any[]>([]);
  const [studentFeeHistory, setStudentFeeHistory] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [lookupOpen, setLookupOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [feeRes, profilesRes, rolesRes, sessionsRes, spRes, subjectsRes, classesRes, scholarshipRes] = await Promise.all([
      supabase.from("fee_records").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*").eq("role", "student"),
      supabase.from("academic_sessions").select("*").order("academic_year"),
      supabase.from("student_profiles").select("*"),
      supabase.from("subjects").select("*").is("deleted_at", null),
      supabase.from("classes").select("*").is("deleted_at", null),
      supabase.from("scholarships").select("*").order("created_at", { ascending: false }),
    ]);
    const profiles = profilesRes.data || [];
    const studentIds = new Set((rolesRes.data || []).map((r: any) => r.user_id));
    setStudents(profiles.filter((p: any) => studentIds.has(p.user_id)));
    setStudentProfiles(spRes.data || []);
    setClasses(classesRes.data || []);
    const all = feeRes.data || [];
    setFeeRecords(all.filter((f: any) => !f.deleted_at));
    setDeletedFees(all.filter((f: any) => f.deleted_at));
    setSessions(sessionsRes.data || []);
    setSubjects(subjectsRes.data || []);
    setScholarships(scholarshipRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getStudentName = (id: string) => students.find((s) => s.user_id === id)?.full_name || "Unknown";
  const getStudentClassName = (studentId: string) => {
    const sp = studentProfiles.find((s: any) => s.user_id === studentId);
    if (!sp?.class_id) return undefined;
    const cls = classes.find((c: any) => c.id === sp.class_id);
    return cls ? `${cls.name}${cls.stream ? ` (${cls.stream})` : ""}` : undefined;
  };
  const getSubjectName = (id: string) => subjects.find((s: any) => s.id === id)?.name || "—";
  const years = [...new Set(sessions.map((s) => s.academic_year))].sort((a: number, b: number) => b - a);
  if (years.length === 0) years.push(new Date().getFullYear());

  const filtered = feeRecords.filter((f) => {
    const name = getStudentName(f.student_id).toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || (f.receipt_number || "").toLowerCase().includes(search.toLowerCase());
    const matchYear = !filterYear || f.academic_year === parseInt(filterYear);
    const matchTerm = !filterTerm || f.term === filterTerm;
    return matchSearch && matchYear && matchTerm;
  });

  const totalDue = filtered.reduce((s, f) => s + Number(f.amount_due), 0);
  const totalPaid = filtered.reduce((s, f) => s + Number(f.amount_paid), 0);

  const handleDelete = async (id: string) => {
    await supabase.from("fee_records").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
    toast({ title: "Fee Record Deleted" }); fetchData();
  };

  const handleRestore = async (id: string) => {
    await supabase.from("fee_records").update({ deleted_at: null } as any).eq("id", id);
    toast({ title: "Fee Record Restored" }); fetchData();
  };

  const handleEditSave = async () => {
    if (!editFee) return;
    const { error } = await supabase.from("fee_records").update({
      amount_due: Number(editFee.amount_due), amount_paid: Number(editFee.amount_paid),
      notes: editFee.notes, payment_method: editFee.payment_method,
      term: editFee.term, academic_year: Number(editFee.academic_year),
    } as any).eq("id", editFee.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Fee Updated" }); setEditOpen(false); fetchData(); }
  };

  // Master student lookup
  const masterFilteredStudents = masterSearch.length >= 2
    ? students.filter(s => {
        const q = masterSearch.toLowerCase();
        const sp = studentProfiles.find(p => p.user_id === s.user_id);
        return s.full_name.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q) || (sp?.student_id || "").toLowerCase().includes(q);
      })
    : [];

  const openStudentLookup = async (student: any) => {
    setSelectedStudent(student);
    setLookupOpen(true);
    const sp = studentProfiles.find(p => p.user_id === student.user_id);

    const [gradesRes, attRes, feesRes] = await Promise.all([
      supabase.from("grades").select("*, subjects(name)").eq("student_id", student.user_id).order("created_at", { ascending: false }).limit(20),
      supabase.from("attendance").select("*").eq("student_id", student.user_id).order("date", { ascending: false }).limit(30),
      supabase.from("fee_records").select("*").eq("student_id", student.user_id).is("deleted_at", null).order("academic_year", { ascending: false }),
    ]);
    setStudentGrades(gradesRes.data || []);
    setStudentAttendance(attRes.data || []);
    setStudentFeeHistory(feesRes.data || []);
  };

  const lookupSp = selectedStudent ? studentProfiles.find(p => p.user_id === selectedStudent.user_id) : null;
  const lookupTotalDue = studentFeeHistory.reduce((s, f) => s + Number(f.amount_due), 0);
  const lookupTotalPaid = studentFeeHistory.reduce((s, f) => s + Number(f.amount_paid), 0);
  const lookupBalance = lookupTotalDue - lookupTotalPaid;
  const attPresent = studentAttendance.filter(a => a.status === "present").length;
  const attTotal = studentAttendance.length;

  // Scholarship handlers
  const handleAddScholarship = async () => {
    if (!scholarshipForm.student_id || !scholarshipForm.organization_name) {
      toast({ title: "Missing fields", description: "Select a student and enter organization name.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("scholarships").insert({
      student_id: scholarshipForm.student_id,
      organization_name: scholarshipForm.organization_name,
      coverage_type: scholarshipForm.coverage_type,
      coverage_percentage: Number(scholarshipForm.coverage_percentage),
      end_date: scholarshipForm.end_date || null,
      notes: scholarshipForm.notes || null,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Scholarship Added" });
      setScholarshipForm({ student_id: "", organization_name: "", coverage_type: "full", coverage_percentage: "100", end_date: "", notes: "" });
      fetchData();
    }
  };

  const handleDeleteScholarship = async (id: string) => {
    await supabase.from("scholarships").delete().eq("id", id);
    toast({ title: "Scholarship Removed" });
    fetchData();
  };

  const handleToggleScholarship = async (id: string, currentActive: boolean) => {
    await supabase.from("scholarships").update({ is_active: !currentActive, updated_at: new Date().toISOString() } as any).eq("id", id);
    toast({ title: currentActive ? "Scholarship Deactivated" : "Scholarship Activated" });
    fetchData();
  };

  const activeScholarships = scholarships.filter(s => s.is_active);

  const exportScholarshipsCSV = () => {
    const headers = ["Student Name", "Student ID", "Organization", "Coverage Type", "Coverage %", "Start Date", "End Date", "Status", "Notes"];
    const rows = scholarships.map(s => {
      const sp = studentProfiles.find((p: any) => p.user_id === s.student_id);
      const isExpired = s.end_date && new Date(s.end_date) < new Date();
      const status = s.is_active && !isExpired ? "Active" : isExpired ? "Expired" : "Inactive";
      return [
        `"${getStudentName(s.student_id)}"`,
        sp?.student_id || "",
        `"${s.organization_name}"`,
        s.coverage_type,
        s.coverage_percentage,
        s.start_date,
        s.end_date || "No end date",
        status,
        `"${(s.notes || "").replace(/"/g, '""')}"`,
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scholarships_report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${scholarships.length} scholarship records exported to CSV.` });
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="font-display text-2xl font-bold text-foreground">Fee Management</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setScannerOpen(true)}>
              <ScanLine className="w-4 h-4 mr-1" /> Verify Receipt
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCharts(!showCharts)}>
              <BarChart3 className="w-4 h-4 mr-1" /> {showCharts ? "Hide Charts" : "Charts"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => generateCSVReport(filtered, getStudentName, zigRate)}>
              <FileDown className="w-4 h-4 mr-1" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Master Student Search */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg"><UserSearch className="w-5 h-5" /> Student Master Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search student by name or email to view full records..."
                value={masterSearch}
                onChange={e => setMasterSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {masterFilteredStudents.length > 0 && (
              <div className="mt-2 border border-border rounded-lg max-h-48 overflow-y-auto">
                {masterFilteredStudents.map(s => {
                  const sp = studentProfiles.find(p => p.user_id === s.user_id);
                  const studentFees = feeRecords.filter(f => f.student_id === s.user_id);
                  const bal = studentFees.reduce((acc, f) => acc + Number(f.amount_due) - Number(f.amount_paid), 0);
                  return (
                    <button
                      key={s.user_id}
                      onClick={() => { openStudentLookup(s); setMasterSearch(""); }}
                      className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center justify-between border-b border-border last:border-0 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-foreground">{s.full_name}</p>
                        <p className="text-xs text-muted-foreground">{s.email} {sp ? `• Form ${sp.form} • ${sp.level?.replace("_"," ").toUpperCase()}` : ""}</p>
                      </div>
                      <span className={`text-sm font-bold ${bal > 0 ? "text-destructive" : "text-green-600"}`}>
                        {bal > 0 ? `Owes $${bal.toFixed(2)}` : "Paid up"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <FeeStructureCard feeStructure={feeStructure} zigRate={zigRate} onFeeStructureChange={setFeeStructure} onZigRateChange={setZigRate} />
        <FeeStatsCards totalDue={totalDue} totalPaid={totalPaid} zigRate={zigRate} />
        {showCharts && <FeeCharts records={filtered} getStudentName={getStudentName} />}

        <AddFeeForm students={students} studentProfiles={studentProfiles} feeStructure={feeStructure} zigRate={zigRate} years={years} onAdded={fetchData} />

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name or receipt..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
              <option value="">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={filterTerm} onChange={e => setFilterTerm(e.target.value)}>
              <option value="">All Terms</option>
              <option value="term_1">Term 1</option><option value="term_2">Term 2</option><option value="term_3">Term 3</option>
            </select>
          </CardContent>
        </Card>

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Records ({filtered.length})</TabsTrigger>
            <TabsTrigger value="deleted">Deleted ({deletedFees.length})</TabsTrigger>
            <TabsTrigger value="scholarships">Scholarships ({activeScholarships.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <FeeRecordsTable
              records={filtered} loading={loading} zigRate={zigRate} getStudentName={getStudentName}
              onPay={r => { setPayRecord(r); setPayOpen(true); }}
              onEdit={r => { setEditFee({ ...r }); setEditOpen(true); }}
              onDelete={handleDelete}
              onPrintReceipt={r => printReceipt(r, getStudentName(r.student_id), zigRate, getStudentClassName(r.student_id))}
            />
          </TabsContent>

          <TabsContent value="deleted">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Student</TableHead><TableHead>Amount</TableHead><TableHead>Deleted</TableHead><TableHead>Actions</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedFees.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No deleted records.</TableCell></TableRow>
                    ) : deletedFees.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{getStudentName(f.student_id)}</TableCell>
                        <TableCell>${Number(f.amount_due).toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(f.deleted_at).toLocaleDateString()}</TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => handleRestore(f.id)}><RotateCcw className="w-4 h-4 text-primary mr-1" /> Restore</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scholarships">
            <div className="space-y-4">
              {/* Add Scholarship Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><GraduationCap className="w-5 h-5" /> Add Scholarship / Organization Sponsorship</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative">
                      <label className="text-xs text-muted-foreground">Student</label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          className="pl-8 text-sm"
                          placeholder="Search by name or ID..."
                          value={scholarshipStudentSearch}
                          onChange={e => { setScholarshipStudentSearch(e.target.value); if (!e.target.value) setScholarshipForm({ ...scholarshipForm, student_id: "" }); }}
                        />
                      </div>
                      {scholarshipStudentSearch.trim().length > 0 && !scholarshipForm.student_id && (
                        <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto border rounded-md bg-popover shadow-md">
                          {students.filter(s => {
                            const sp = studentProfiles.find((p: any) => p.user_id === s.user_id);
                            const q = scholarshipStudentSearch.toLowerCase();
                            return (s.full_name || "").toLowerCase().includes(q) || (sp?.student_id || "").toLowerCase().includes(q);
                          }).slice(0, 8).map(s => {
                            const sp = studentProfiles.find((p: any) => p.user_id === s.user_id);
                            return (
                              <div key={s.user_id} className="p-2 hover:bg-accent/50 cursor-pointer text-sm flex justify-between" onClick={() => { setScholarshipForm({ ...scholarshipForm, student_id: s.user_id }); setScholarshipStudentSearch(s.full_name + (sp?.student_id ? ` (${sp.student_id})` : "")); }}>
                                <span>{s.full_name}</span>
                                {sp?.student_id && <span className="text-xs text-muted-foreground">{sp.student_id}</span>}
                              </div>
                            );
                          })}
                          {students.filter(s => {
                            const sp = studentProfiles.find((p: any) => p.user_id === s.user_id);
                            const q = scholarshipStudentSearch.toLowerCase();
                            return (s.full_name || "").toLowerCase().includes(q) || (sp?.student_id || "").toLowerCase().includes(q);
                          }).length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No students found</p>}
                        </div>
                      )}
                      {scholarshipForm.student_id && (
                        <button type="button" className="absolute right-2 top-8 text-muted-foreground hover:text-foreground" onClick={() => { setScholarshipForm({ ...scholarshipForm, student_id: "" }); setScholarshipStudentSearch(""); }}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Organization</label>
                      <Input placeholder="e.g. BEAM, CAMFED, HIGHERLIFE..." value={scholarshipForm.organization_name} onChange={e => setScholarshipForm({ ...scholarshipForm, organization_name: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Coverage</label>
                      <select className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm" value={scholarshipForm.coverage_type} onChange={e => setScholarshipForm({ ...scholarshipForm, coverage_type: e.target.value, coverage_percentage: e.target.value === "full" ? "100" : scholarshipForm.coverage_percentage })}>
                        <option value="full">Full (100%)</option>
                        <option value="partial">Partial</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {scholarshipForm.coverage_type === "partial" && (
                      <div>
                        <label className="text-xs text-muted-foreground">Coverage %</label>
                        <Input type="number" min="1" max="99" value={scholarshipForm.coverage_percentage} onChange={e => setScholarshipForm({ ...scholarshipForm, coverage_percentage: e.target.value })} />
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-muted-foreground">End Date (auto-expires)</label>
                      <Input type="date" value={scholarshipForm.end_date} onChange={e => setScholarshipForm({ ...scholarshipForm, end_date: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Notes</label>
                      <Input placeholder="Optional notes..." value={scholarshipForm.notes} onChange={e => setScholarshipForm({ ...scholarshipForm, notes: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddScholarship}><Plus className="w-4 h-4 mr-1" /> Add Scholarship</Button>
                    <Button variant="outline" onClick={exportScholarshipsCSV} disabled={scholarships.length === 0}><FileDown className="w-4 h-4 mr-1" /> Export CSV</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Scholarships Table */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg flex-1">All Scholarships</CardTitle>
                    <div className="relative w-64">
                      <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                      <Input className="pl-8 h-9 text-sm" placeholder="Filter by student or org..." value={scholarshipSearch} onChange={e => setScholarshipSearch(e.target.value)} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Coverage</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const sq = scholarshipSearch.toLowerCase();
                        const filteredScholarships = scholarships.filter(s => {
                          if (!sq) return true;
                          const name = getStudentName(s.student_id).toLowerCase();
                          return name.includes(sq) || (s.organization_name || "").toLowerCase().includes(sq);
                        });
                        return filteredScholarships.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{sq ? "No matching scholarships." : "No scholarships configured."}</TableCell></TableRow>
                        ) : filteredScholarships.map(s => {
                        const isExpired = s.end_date && new Date(s.end_date) < new Date();
                        return (
                          <TableRow key={s.id} className={!s.is_active ? "opacity-50" : ""}>
                            <TableCell className="font-medium">{getStudentName(s.student_id)}</TableCell>
                            <TableCell>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">{s.organization_name}</span>
                            </TableCell>
                            <TableCell>
                              {s.coverage_type === "full" ? (
                                <span className="text-green-600 font-bold">100%</span>
                              ) : (
                                <span className="font-bold">{s.coverage_percentage}%</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div>{new Date(s.start_date).toLocaleDateString()}</div>
                              {s.end_date && (
                                <div className={`text-xs ${isExpired ? "text-destructive" : "text-muted-foreground"}`}>
                                  <Calendar className="w-3 h-3 inline mr-1" />
                                  {isExpired ? "Expired" : "Ends"}: {new Date(s.end_date).toLocaleDateString()}
                                </div>
                              )}
                              {!s.end_date && <div className="text-xs text-muted-foreground">No end date</div>}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.is_active && !isExpired ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                {s.is_active && !isExpired ? "Active" : isExpired ? "Expired" : "Inactive"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleToggleScholarship(s.id, s.is_active)}>
                                  {s.is_active ? "Deactivate" : "Activate"}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteScholarship(s.id)}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      });
                      })()}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <PaymentDialog record={payRecord} open={payOpen} onOpenChange={setPayOpen} zigRate={zigRate} getStudentName={getStudentName} onPaid={fetchData} />

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Fee Record</DialogTitle></DialogHeader>
            {editFee && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">{getStudentName(editFee.student_id)}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">Year</label><Input type="number" value={editFee.academic_year} onChange={e => setEditFee({ ...editFee, academic_year: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">Term</label>
                    <select className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm" value={editFee.term} onChange={e => setEditFee({ ...editFee, term: e.target.value })}>
                      <option value="term_1">Term 1</option><option value="term_2">Term 2</option><option value="term_3">Term 3</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">Amount Due (USD)</label><Input type="number" value={editFee.amount_due} onChange={e => setEditFee({ ...editFee, amount_due: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">Amount Paid (USD)</label><Input type="number" value={editFee.amount_paid} onChange={e => setEditFee({ ...editFee, amount_paid: e.target.value })} /></div>
                </div>
                <div><label className="text-xs text-muted-foreground">Payment Method</label>
                  <select className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm" value={editFee.payment_method || "cash"} onChange={e => setEditFee({ ...editFee, payment_method: e.target.value })}>
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div><label className="text-xs text-muted-foreground">Notes</label><Input value={editFee.notes || ""} onChange={e => setEditFee({ ...editFee, notes: e.target.value })} /></div>
                <Button className="w-full" onClick={handleEditSave}>Save Changes</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Master Student Lookup Dialog */}
        <Dialog open={lookupOpen} onOpenChange={setLookupOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserSearch className="w-5 h-5" /> Student Master Record
              </DialogTitle>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
                    {selectedStudent.full_name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-bold text-foreground">{selectedStudent.full_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedStudent.email}</p>
                    {lookupSp && (
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">Form {lookupSp.form}</span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">{lookupSp.level?.replace("_"," ").toUpperCase()}</span>
                        {lookupSp.student_id && <span className="text-xs font-mono text-muted-foreground">ID: {lookupSp.student_id}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className={`text-xl font-bold ${lookupBalance > 0 ? "text-destructive" : "text-green-600"}`}>
                      ${lookupBalance.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">Fee Balance</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xl font-bold text-foreground">
                      {studentGrades.length > 0 ? `${Math.round(studentGrades.reduce((s, g) => s + Number(g.mark), 0) / studentGrades.length)}%` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Grade</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-xl font-bold text-foreground">
                      {attTotal > 0 ? `${Math.round((attPresent / attTotal) * 100)}%` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">Attendance</p>
                  </div>
                </div>

                {/* Identity & Medical */}
                {lookupSp && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Shield className="w-4 h-4" /> Identity & Guardian</CardTitle></CardHeader>
                      <CardContent className="text-sm space-y-1">
                        <p><span className="text-muted-foreground">DOB:</span> {lookupSp.date_of_birth || "—"}</p>
                        <p><span className="text-muted-foreground">National ID:</span> {lookupSp.national_id || "—"}</p>
                        <p><span className="text-muted-foreground">Birth Cert:</span> {lookupSp.birth_cert_number || "—"}</p>
                        <p><span className="text-muted-foreground">Guardian:</span> {lookupSp.guardian_name || "—"} ({lookupSp.guardian_phone || "—"})</p>
                        <p><span className="text-muted-foreground">Address:</span> {lookupSp.address || "—"}</p>
                        <p><span className="text-muted-foreground">Emergency:</span> {lookupSp.emergency_contact || "—"} ({lookupSp.emergency_phone || "—"})</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><Heart className="w-4 h-4" /> Medical</CardTitle></CardHeader>
                      <CardContent className="text-sm space-y-1">
                        <p><span className="text-muted-foreground">Blood Type:</span> {lookupSp.blood_type || "—"}</p>
                        <p><span className="text-muted-foreground">Allergies:</span> {lookupSp.allergies || "None"}</p>
                        <p><span className="text-muted-foreground">Conditions:</span> {lookupSp.medical_conditions || "None"}</p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Fee History */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><DollarSign className="w-4 h-4" /> Fee History</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow><TableHead>Year</TableHead><TableHead>Term</TableHead><TableHead>Due</TableHead><TableHead>Paid</TableHead><TableHead>Balance</TableHead><TableHead>Method</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentFeeHistory.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">No fee records.</TableCell></TableRow>
                        ) : studentFeeHistory.map(f => {
                          const bal = Number(f.amount_due) - Number(f.amount_paid);
                          return (
                            <TableRow key={f.id}>
                              <TableCell>{f.academic_year}</TableCell>
                              <TableCell>{f.term.replace("_"," ").toUpperCase()}</TableCell>
                              <TableCell>${Number(f.amount_due).toFixed(2)}</TableCell>
                              <TableCell className="text-green-600">${Number(f.amount_paid).toFixed(2)}</TableCell>
                              <TableCell className={`font-bold ${bal > 0 ? "text-destructive" : "text-green-600"}`}>${bal.toFixed(2)}</TableCell>
                              <TableCell className="text-xs">{methodLabel(f.payment_method)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Recent Grades */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><BookOpen className="w-4 h-4" /> Recent Grades</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow><TableHead>Subject</TableHead><TableHead>Mark</TableHead><TableHead>Grade</TableHead><TableHead>Term</TableHead><TableHead>Year</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentGrades.length === 0 ? (
                          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">No grades.</TableCell></TableRow>
                        ) : studentGrades.map(g => {
                          const mark = Number(g.mark);
                          const color = mark >= 70 ? "text-green-600" : mark >= 50 ? "text-yellow-600" : "text-destructive";
                          return (
                            <TableRow key={g.id}>
                              <TableCell>{g.subjects?.name || getSubjectName(g.subject_id)}</TableCell>
                              <TableCell className={`font-bold ${color}`}>{mark}%</TableCell>
                              <TableCell className="font-bold">{g.grade_letter || "—"}</TableCell>
                              <TableCell>{g.term.replace("_"," ").toUpperCase()}</TableCell>
                              <TableCell>{g.academic_year}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Attendance Summary */}
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1"><ClipboardCheck className="w-4 h-4" /> Recent Attendance ({attTotal} records)</CardTitle></CardHeader>
                  <CardContent>
                    {attTotal === 0 ? (
                      <p className="text-sm text-muted-foreground">No attendance records.</p>
                    ) : (
                      <div className="flex gap-3 flex-wrap">
                        {["present", "absent", "late", "excused"].map(status => {
                          const count = studentAttendance.filter(a => a.status === status).length;
                          const colors: Record<string, string> = {
                            present: "bg-green-100 text-green-700",
                            absent: "bg-red-100 text-red-700",
                            late: "bg-yellow-100 text-yellow-700",
                            excused: "bg-blue-100 text-blue-700",
                          };
                          return (
                            <span key={status} className={`px-3 py-1.5 rounded-full text-sm font-medium ${colors[status]}`}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}: {count}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
        <BarcodeScanner
          open={scannerOpen}
          onOpenChange={setScannerOpen}
          students={students}
          studentProfiles={studentProfiles}
          classes={classes}
        />
      </div>
    </DashboardLayout>
  );
};

export default AdminFees;

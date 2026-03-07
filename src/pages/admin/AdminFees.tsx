import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Plus, Search, Receipt, Trash2, RotateCcw, Edit, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ZIG_RATE = 28.5; // 1 USD = 28.5 ZIG (adjustable)

const FEE_STRUCTURE: Record<string, number> = {
  zjc: 100,
  o_level: 120,
  a_level: 140,
};

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "ecocash", label: "EcoCash" },
  { value: "innbucks", label: "InnBucks" },
  { value: "zipit", label: "ZIPIT" },
  { value: "swipe", label: "Swipe / POS" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

const AdminFees = () => {
  const { toast } = useToast();
  const [feeRecords, setFeeRecords] = useState<any[]>([]);
  const [deletedFees, setDeletedFees] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentProfiles, setStudentProfiles] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterTerm, setFilterTerm] = useState("");
  const [zigRate, setZigRate] = useState(ZIG_RATE);

  const [selectedStudent, setSelectedStudent] = useState("");
  const [term, setTerm] = useState<string>("term_1");
  const [feeYear, setFeeYear] = useState(new Date().getFullYear().toString());
  const [amountDue, setAmountDue] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [editFee, setEditFee] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [feeRes, profilesRes, rolesRes, sessionsRes, spRes] = await Promise.all([
      supabase.from("fee_records").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*").eq("role", "student"),
      supabase.from("academic_sessions").select("*").order("academic_year"),
      supabase.from("student_profiles").select("*"),
    ]);
    const profiles = profilesRes.data || [];
    const studentIds = new Set((rolesRes.data || []).map((r: any) => r.user_id));
    setStudents(profiles.filter((p: any) => studentIds.has(p.user_id)));
    setStudentProfiles(spRes.data || []);
    const all = feeRes.data || [];
    setFeeRecords(all.filter((f: any) => !f.deleted_at));
    setDeletedFees(all.filter((f: any) => f.deleted_at));
    setSessions(sessionsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getStudentName = (id: string) => students.find(s => s.user_id === id)?.full_name || "Unknown";
  const getStudentLevel = (id: string) => studentProfiles.find(s => s.user_id === id)?.level || "o_level";
  const years = [...new Set(sessions.map(s => s.academic_year))].sort((a, b) => b - a);

  const generateReceipt = () => {
    const d = new Date();
    return `REC-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  };

  // Auto-fill fee based on student level
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudent(studentId);
    const level = getStudentLevel(studentId);
    setAmountDue(String(FEE_STRUCTURE[level] || 120));
  };

  const toUSD = (amount: number, curr: string) => curr === "ZIG" ? amount / zigRate : amount;
  const toZIG = (usd: number) => usd * zigRate;

  const filtered = feeRecords.filter(f => {
    const name = getStudentName(f.student_id).toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || (f.receipt_number || "").toLowerCase().includes(search.toLowerCase());
    const matchYear = !filterYear || f.academic_year === parseInt(filterYear);
    const matchTerm = !filterTerm || f.term === filterTerm;
    return matchSearch && matchYear && matchTerm;
  });

  const totalDue = filtered.reduce((s, f) => s + Number(f.amount_due), 0);
  const totalPaid = filtered.reduce((s, f) => s + Number(f.amount_paid), 0);

  const handleAdd = async () => {
    if (!selectedStudent || !amountDue) { toast({ title: "Error", description: "Select student and amount.", variant: "destructive" }); return; }
    const receiptNumber = Number(amountPaid) > 0 ? generateReceipt() : null;
    const dueUSD = currency === "ZIG" ? Number(amountDue) / zigRate : Number(amountDue);
    const paidUSD = currency === "ZIG" ? (Number(amountPaid) || 0) / zigRate : (Number(amountPaid) || 0);
    const { error } = await supabase.from("fee_records").insert({
      student_id: selectedStudent, term: term as any, academic_year: parseInt(feeYear),
      amount_due: Math.round(dueUSD * 100) / 100,
      amount_paid: Math.round(paidUSD * 100) / 100,
      notes: notes || null, receipt_number: receiptNumber,
      payment_date: Number(amountPaid) > 0 ? new Date().toISOString().split("T")[0] : null,
      payment_method: paymentMethod, currency,
      zig_amount: Math.round(dueUSD * zigRate * 100) / 100,
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Fee Added", description: receiptNumber ? `Receipt: ${receiptNumber}` : undefined }); setSelectedStudent(""); setAmountDue(""); setAmountPaid(""); setNotes(""); fetchData(); }
  };

  const handlePay = async (record: any) => {
    const balance = Number(record.amount_due) - Number(record.amount_paid);
    const payment = prompt(`Enter payment amount in USD (Owing: $${balance.toFixed(2)} / ZIG ${(balance * zigRate).toFixed(2)}):`);
    if (!payment || isNaN(Number(payment))) return;
    const newPaid = Number(record.amount_paid) + Number(payment);
    const receipt = generateReceipt();
    const { error } = await supabase.from("fee_records").update({
      amount_paid: newPaid, receipt_number: receipt,
      payment_date: new Date().toISOString().split("T")[0],
    }).eq("id", record.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Payment Recorded", description: `Receipt: ${receipt}` }); fetchData(); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("fee_records").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
    toast({ title: "Fee Deleted" }); fetchData();
  };

  const handleRestore = async (id: string) => {
    await supabase.from("fee_records").update({ deleted_at: null } as any).eq("id", id);
    toast({ title: "Fee Restored" }); fetchData();
  };

  const handleEditSave = async () => {
    if (!editFee) return;
    const { error } = await supabase.from("fee_records").update({
      amount_due: Number(editFee.amount_due), amount_paid: Number(editFee.amount_paid), notes: editFee.notes,
      payment_method: editFee.payment_method,
    } as any).eq("id", editFee.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Fee Updated" }); setEditOpen(false); fetchData(); }
  };

  const methodLabel = (m: string) => PAYMENT_METHODS.find(p => p.value === m)?.label || m;

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Fee Management</h1>

        {/* Fee Structure Card */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Fee Structure (per term)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(FEE_STRUCTURE).map(([level, usd]) => (
                <div key={level} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                  <span className="font-medium text-foreground">{level.replace("_", " ").toUpperCase()}</span>
                  <div className="text-right">
                    <p className="font-bold text-foreground">${usd} USD</p>
                    <p className="text-xs text-muted-foreground">ZIG {(usd * zigRate).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-4">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Exchange Rate: 1 USD =</span>
              <Input type="number" value={zigRate} onChange={e => setZigRate(Number(e.target.value) || ZIG_RATE)} className="w-24" />
              <span className="text-sm text-muted-foreground">ZIG</span>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Total Billed", usd: totalDue, color: "text-primary" },
            { label: "Collected", usd: totalPaid, color: "text-green-600" },
            { label: "Outstanding", usd: totalDue - totalPaid, color: "text-destructive" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`p-3 rounded-lg bg-muted ${s.color}`}><DollarSign className="w-6 h-6" /></div>
                <div>
                  <p className="text-2xl font-bold">${s.usd.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">ZIG {toZIG(s.usd).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add Fee Record */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Add Fee Record</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm flex-1 min-w-[200px]" value={selectedStudent} onChange={e => handleStudentSelect(e.target.value)}>
                <option value="">Select Student...</option>
                {students.map(s => <option key={s.user_id} value={s.user_id}>{s.full_name}</option>)}
              </select>
              <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={feeYear} onChange={e => setFeeYear(e.target.value)}>
                {years.length > 0 ? years.map(y => <option key={y} value={y}>{y}</option>) : <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>}
              </select>
              <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={term} onChange={e => setTerm(e.target.value)}>
                <option value="term_1">Term 1</option><option value="term_2">Term 2</option><option value="term_3">Term 3</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-3">
              <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={currency} onChange={e => setCurrency(e.target.value)}>
                <option value="USD">USD ($)</option>
                <option value="ZIG">ZIG</option>
              </select>
              <Input placeholder="Amount Due" type="number" value={amountDue} onChange={e => setAmountDue(e.target.value)} className="w-36" />
              <Input placeholder="Amount Paid" type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} className="w-36" />
              <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              {amountDue && (
                <div className="flex items-center text-xs text-muted-foreground bg-muted px-3 rounded-lg">
                  {currency === "USD" ? `= ZIG ${(Number(amountDue) * zigRate).toFixed(2)}` : `= $${(Number(amountDue) / zigRate).toFixed(2)} USD`}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <Input placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} className="flex-1 min-w-[200px]" />
              <Button onClick={handleAdd}><Plus className="w-4 h-4 mr-1" /> Add</Button>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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
          </TabsList>

          <TabsContent value="active">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead><TableHead>Year</TableHead><TableHead>Term</TableHead>
                      <TableHead>Due (USD)</TableHead><TableHead>Due (ZIG)</TableHead><TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead><TableHead>Method</TableHead><TableHead>Receipt</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No records.</TableCell></TableRow>
                    ) : filtered.map(f => {
                      const balance = Number(f.amount_due) - Number(f.amount_paid);
                      const isPaid = balance <= 0;
                      return (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{getStudentName(f.student_id)}</TableCell>
                          <TableCell>{f.academic_year}</TableCell>
                          <TableCell>{f.term.replace("_", " ").toUpperCase()}</TableCell>
                          <TableCell>${Number(f.amount_due).toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">ZIG {toZIG(Number(f.amount_due)).toFixed(0)}</TableCell>
                          <TableCell className="text-green-600">${Number(f.amount_paid).toFixed(2)}</TableCell>
                          <TableCell className={isPaid ? "text-green-600" : "text-destructive"}>${balance.toFixed(2)}</TableCell>
                          <TableCell className="text-xs">{methodLabel((f as any).payment_method || "cash")}</TableCell>
                          <TableCell className="text-xs font-mono">{f.receipt_number || "—"}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${isPaid ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                              {isPaid ? "Paid" : "Owing"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {!isPaid && <Button variant="outline" size="sm" onClick={() => handlePay(f)}><Receipt className="w-4 h-4" /></Button>}
                              <Button variant="ghost" size="sm" onClick={() => { setEditFee({ ...f }); setEditOpen(true); }}><Edit className="w-4 h-4" /></Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(f.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
                  <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Amount</TableHead><TableHead>Deleted</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {deletedFees.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No deleted records.</TableCell></TableRow>
                    ) : deletedFees.map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{getStudentName(f.student_id)}</TableCell>
                        <TableCell>${Number(f.amount_due).toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(f.deleted_at).toLocaleDateString()}</TableCell>
                        <TableCell><Button variant="ghost" size="sm" onClick={() => handleRestore(f.id)}><RotateCcw className="w-4 h-4 text-primary" /> Restore</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Fee Record</DialogTitle></DialogHeader>
            {editFee && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{getStudentName(editFee.student_id)}</p>
                <Input type="number" placeholder="Amount Due (USD)" value={editFee.amount_due} onChange={e => setEditFee({ ...editFee, amount_due: e.target.value })} />
                <Input type="number" placeholder="Amount Paid (USD)" value={editFee.amount_paid} onChange={e => setEditFee({ ...editFee, amount_paid: e.target.value })} />
                <select className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm" value={editFee.payment_method || "cash"} onChange={e => setEditFee({ ...editFee, payment_method: e.target.value })}>
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <Input placeholder="Notes" value={editFee.notes || ""} onChange={e => setEditFee({ ...editFee, notes: e.target.value })} />
                <Button className="w-full" onClick={handleEditSave}>Save Changes</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminFees;

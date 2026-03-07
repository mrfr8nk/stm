import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Plus, Search, Download, Receipt } from "lucide-react";

const AdminFees = () => {
  const { toast } = useToast();
  const [feeRecords, setFeeRecords] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // New fee form
  const [selectedStudent, setSelectedStudent] = useState("");
  const [term, setTerm] = useState<string>("term_1");
  const [amountDue, setAmountDue] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");

  // Stats
  const [stats, setStats] = useState({ totalDue: 0, totalPaid: 0, totalOwing: 0 });

  const fetchData = async () => {
    setLoading(true);
    const [feeRes, profilesRes, rolesRes] = await Promise.all([
      supabase.from("fee_records").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*"),
      supabase.from("user_roles").select("*").eq("role", "student"),
    ]);

    const profiles = profilesRes.data || [];
    const studentUserIds = new Set((rolesRes.data || []).map((r: any) => r.user_id));
    const studentList = profiles.filter((p: any) => studentUserIds.has(p.user_id));
    setStudents(studentList);

    const fees = feeRes.data || [];
    setFeeRecords(fees);

    const totalDue = fees.reduce((sum: number, f: any) => sum + Number(f.amount_due), 0);
    const totalPaid = fees.reduce((sum: number, f: any) => sum + Number(f.amount_paid), 0);
    setStats({ totalDue, totalPaid, totalOwing: totalDue - totalPaid });

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getStudentName = (studentId: string) => {
    const student = students.find((s: any) => s.user_id === studentId);
    return student?.full_name || "Unknown";
  };

  const generateReceiptNumber = () => {
    const date = new Date();
    return `REC-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  };

  const handleAddFee = async () => {
    if (!selectedStudent || !amountDue) {
      toast({ title: "Error", description: "Select a student and enter amount due.", variant: "destructive" });
      return;
    }
    const receiptNumber = Number(amountPaid) > 0 ? generateReceiptNumber() : null;
    const { error } = await supabase.from("fee_records").insert({
      student_id: selectedStudent,
      term: term as any,
      amount_due: Number(amountDue),
      amount_paid: Number(amountPaid) || 0,
      notes: notes || null,
      receipt_number: receiptNumber,
      payment_date: Number(amountPaid) > 0 ? new Date().toISOString().split("T")[0] : null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Fee Record Added", description: receiptNumber ? `Receipt: ${receiptNumber}` : "No payment recorded yet." });
      setSelectedStudent(""); setAmountDue(""); setAmountPaid(""); setNotes("");
      fetchData();
    }
  };

  const handleRecordPayment = async (record: any) => {
    const payment = prompt(`Enter payment amount for ${getStudentName(record.student_id)} (Owing: $${(record.amount_due - record.amount_paid).toFixed(2)}):`);
    if (!payment || isNaN(Number(payment))) return;
    const newPaid = Number(record.amount_paid) + Number(payment);
    const receiptNumber = generateReceiptNumber();
    const { error } = await supabase.from("fee_records").update({
      amount_paid: newPaid,
      receipt_number: receiptNumber,
      payment_date: new Date().toISOString().split("T")[0],
    }).eq("id", record.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Payment Recorded", description: `Receipt: ${receiptNumber}` });
      fetchData();
    }
  };

  const filtered = feeRecords.filter((f: any) => {
    const name = getStudentName(f.student_id).toLowerCase();
    return name.includes(search.toLowerCase()) || (f.receipt_number || "").toLowerCase().includes(search.toLowerCase());
  });

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Fee Management</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Total Billed", value: `$${stats.totalDue.toLocaleString()}`, color: "text-primary" },
            { label: "Total Collected", value: `$${stats.totalPaid.toLocaleString()}`, color: "text-green-600" },
            { label: "Outstanding", value: `$${stats.totalOwing.toLocaleString()}`, color: "text-destructive" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`p-3 rounded-lg bg-muted ${s.color}`}><DollarSign className="w-6 h-6" /></div>
                <div><p className="text-2xl font-bold">{s.value}</p><p className="text-sm text-muted-foreground">{s.label}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add Fee */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Add Fee Record</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <select
                className="border border-input rounded-lg px-3 py-2 bg-background text-sm flex-1 min-w-[200px]"
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
              >
                <option value="">Select Student...</option>
                {students.map((s: any) => (
                  <option key={s.user_id} value={s.user_id}>{s.full_name}</option>
                ))}
              </select>
              <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={term} onChange={(e) => setTerm(e.target.value)}>
                <option value="term_1">Term 1</option>
                <option value="term_2">Term 2</option>
                <option value="term_3">Term 3</option>
              </select>
            </div>
            <div className="flex flex-wrap gap-3">
              <Input placeholder="Amount Due" type="number" value={amountDue} onChange={(e) => setAmountDue(e.target.value)} className="w-40" />
              <Input placeholder="Amount Paid" type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="w-40" />
              <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="flex-1 min-w-[200px]" />
              <Button onClick={handleAddFee}><Plus className="w-4 h-4 mr-1" /> Add</Button>
            </div>
          </CardContent>
        </Card>

        {/* Records */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle>Fee Records</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-64" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No fee records found.</TableCell></TableRow>
                ) : (
                  filtered.map((f: any) => {
                    const balance = Number(f.amount_due) - Number(f.amount_paid);
                    const isPaid = balance <= 0;
                    return (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{getStudentName(f.student_id)}</TableCell>
                        <TableCell>{f.term.replace("_", " ").toUpperCase()}</TableCell>
                        <TableCell>${Number(f.amount_due).toLocaleString()}</TableCell>
                        <TableCell>${Number(f.amount_paid).toLocaleString()}</TableCell>
                        <TableCell className={isPaid ? "text-green-600" : "text-destructive"}>
                          ${balance.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{f.receipt_number || "—"}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${isPaid ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {isPaid ? "Paid" : "Owing"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {!isPaid && (
                            <Button variant="outline" size="sm" onClick={() => handleRecordPayment(f)}>
                              <Receipt className="w-4 h-4 mr-1" /> Pay
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminFees;

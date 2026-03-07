import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, ShoppingCart, Plus, Trash2, Clock, TrendingDown, TrendingUp, Receipt, ZoomIn, Image } from "lucide-react";
import ReceiptImageUpload from "@/components/ReceiptImageUpload";
import ExportDropdown from "@/components/ExportDropdown";

const PETTY_CASH_CATEGORIES = [
  "Stationery", "Cleaning Supplies", "Maintenance", "Transport", "Food & Beverages",
  "Utilities", "Equipment", "Events", "Miscellaneous"
];

const AdminFinance = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [pettyCash, setPettyCash] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({ description: "", amount: "", category: "Stationery", payment_method: "cash", receipt_reference: "", date: new Date().toISOString().split("T")[0], notes: "", receipt_image_url: "" });
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [paymentsRes, pettyRes, profilesRes] = await Promise.all([
      supabase.from("fee_records").select("*").is("deleted_at", null).gte("payment_date", thirtyDaysAgo.toISOString().split("T")[0]).order("payment_date", { ascending: false }),
      supabase.from("petty_cash").select("*").is("deleted_at", null).order("date", { ascending: false }),
      supabase.from("profiles").select("user_id, full_name"),
    ]);
    setRecentPayments(paymentsRes.data || []);
    setPettyCash(pettyRes.data || []);
    setProfiles(profilesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const getName = (id: string) => profiles.find(p => p.user_id === id)?.full_name || "Unknown";

  const handleAddPettyCash = async () => {
    if (!newEntry.description || !newEntry.amount) {
      toast({ title: "Missing Fields", description: "Description and amount are required.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("petty_cash").insert({
      description: newEntry.description,
      amount: Number(newEntry.amount),
      category: newEntry.category,
      payment_method: newEntry.payment_method,
      receipt_reference: newEntry.receipt_reference || null,
      date: newEntry.date,
      notes: newEntry.notes || null,
      recorded_by: user?.id,
      receipt_image_url: newEntry.receipt_image_url || null,
    } as any);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Petty Cash Entry Added" });
      setAddOpen(false);
      setNewEntry({ description: "", amount: "", category: "Stationery", payment_method: "cash", receipt_reference: "", date: new Date().toISOString().split("T")[0], notes: "", receipt_image_url: "" });
      fetchData();
    }
  };

  const handleDeletePetty = async (id: string) => {
    if (!confirm("Delete this petty cash entry?")) return;
    await supabase.from("petty_cash").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
    toast({ title: "Entry Deleted" });
    fetchData();
  };

  const totalIncome30d = recentPayments.reduce((s, f) => s + Number(f.amount_paid), 0);
  const recentPetty = pettyCash.filter(p => {
    const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30);
    return new Date(p.date) >= thirtyAgo;
  });
  const totalExpenses = recentPetty.reduce((s, p) => s + Number(p.amount), 0);
  const totalPettyAll = pettyCash.reduce((s, p) => s + Number(p.amount), 0);

  const categoryTotals: Record<string, number> = {};
  pettyCash.forEach(p => { categoryTotals[p.category] = (categoryTotals[p.category] || 0) + Number(p.amount); });

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Finance & Transactions</h1>
            <p className="text-muted-foreground text-sm">Payment logs, petty cash & expense tracking</p>
          </div>
          <div className="flex gap-2">
            <ExportDropdown
              title="Fee Payments Report"
              filename="fee_payments"
              headers={["Student", "Amount Paid", "Amount Due", "Method", "Receipt #", "Date"]}
              rows={recentPayments.map(p => [getName(p.student_id), p.amount_paid, p.amount_due, p.payment_method || "", p.receipt_number || "", p.payment_date || ""])}
              disabled={recentPayments.length === 0}
            />
            <ExportDropdown
              title="Petty Cash Report"
              filename="petty_cash"
              headers={["Date", "Description", "Category", "Amount", "Method", "Receipt Ref", "Recorded By", "Notes"]}
              rows={pettyCash.map(p => [p.date, p.description, p.category, p.amount, p.payment_method || "", p.receipt_reference || "", getName(p.recorded_by), p.notes || ""])}
              disabled={pettyCash.length === 0}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-green-500/10 text-green-600"><TrendingUp className="w-5 h-5" /></div>
            <div><p className="text-xl font-bold text-green-600">${totalIncome30d.toFixed(2)}</p><p className="text-xs text-muted-foreground">Fee Income (30 days)</p></div>
          </CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-destructive/10 text-destructive"><TrendingDown className="w-5 h-5" /></div>
            <div><p className="text-xl font-bold text-destructive">${totalExpenses.toFixed(2)}</p><p className="text-xs text-muted-foreground">Expenses (30 days)</p></div>
          </CardContent></Card>
          <Card><CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 rounded-lg bg-primary/10 text-primary"><DollarSign className="w-5 h-5" /></div>
            <div><p className="text-xl font-bold">${totalPettyAll.toFixed(2)}</p><p className="text-xs text-muted-foreground">Total Petty Cash (All Time)</p></div>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="payments">
          <TabsList>
            <TabsTrigger value="payments"><Clock className="w-4 h-4 mr-1" /> Recent Payments ({recentPayments.length})</TabsTrigger>
            <TabsTrigger value="petty"><ShoppingCart className="w-4 h-4 mr-1" /> Petty Cash ({pettyCash.length})</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="payments">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Receipt className="w-5 h-5" /> Fee Payments — Last 30 Days</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead><TableHead>Amount Paid</TableHead><TableHead>Method</TableHead>
                      <TableHead>Receipt</TableHead><TableHead>Payment Date & Time</TableHead><TableHead>Term / Year</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : recentPayments.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No payments in the last 30 days.</TableCell></TableRow>
                    ) : recentPayments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{getName(p.student_id)}</TableCell>
                        <TableCell className="text-green-600 font-bold">${Number(p.amount_paid).toFixed(2)}</TableCell>
                        <TableCell className="text-sm">{p.payment_method || "cash"}</TableCell>
                        <TableCell className="text-xs font-mono">{p.receipt_number || "—"}</TableCell>
                        <TableCell className="text-sm">
                          {p.payment_date ? new Date(p.payment_date).toLocaleDateString() : "—"}
                          <span className="text-xs text-muted-foreground ml-1">{new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </TableCell>
                        <TableCell className="text-sm">{p.term?.replace("_", " ").toUpperCase()} {p.academic_year}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="petty">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg"><ShoppingCart className="w-5 h-5" /> Petty Cash Records</CardTitle>
                  <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add Entry</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Ref</TableHead><TableHead>Proof</TableHead>
                      <TableHead>Recorded By</TableHead><TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : pettyCash.length === 0 ? (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No petty cash records yet.</TableCell></TableRow>
                    ) : pettyCash.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{new Date(p.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{p.description}{p.notes && <span className="text-xs text-muted-foreground ml-1">({p.notes})</span>}</TableCell>
                        <TableCell><span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">{p.category}</span></TableCell>
                        <TableCell className="text-destructive font-bold">${Number(p.amount).toFixed(2)}</TableCell>
                        <TableCell className="text-sm">{p.payment_method}</TableCell>
                        <TableCell className="text-xs font-mono">{p.receipt_reference || "—"}</TableCell>
                        <TableCell>
                          {p.receipt_image_url ? (
                            <button onClick={() => setViewingImage(p.receipt_image_url)} className="group">
                              <img src={p.receipt_image_url} alt="Proof" className="w-10 h-10 rounded object-cover border border-border group-hover:ring-2 ring-primary transition-all" />
                            </button>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm">{getName(p.recorded_by)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader><CardTitle className="text-lg">Expense Breakdown by Category</CardTitle></CardHeader>
              <CardContent>
                {Object.keys(categoryTotals).length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No expenses recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(categoryTotals).sort(([, a], [, b]) => b - a).map(([cat, total]) => (
                      <div key={cat} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div className="flex items-center gap-3"><ShoppingCart className="w-4 h-4 text-muted-foreground" /><span className="font-medium">{cat}</span></div>
                        <div className="text-right">
                          <p className="font-bold text-destructive">${total.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{totalPettyAll > 0 ? ((total / totalPettyAll) * 100).toFixed(1) : 0}% of total</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Petty Cash Entry</DialogTitle>
              <DialogDescription>Record a school purchase or expense</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div><label className="text-xs font-medium text-muted-foreground">Description *</label>
                <Input placeholder="e.g. Whiteboard markers" value={newEntry.description} onChange={e => setNewEntry({ ...newEntry, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground">Amount (USD) *</label>
                  <Input type="number" step="0.01" placeholder="0.00" value={newEntry.amount} onChange={e => setNewEntry({ ...newEntry, amount: e.target.value })} /></div>
                <div><label className="text-xs font-medium text-muted-foreground">Date</label>
                  <Input type="date" value={newEntry.date} onChange={e => setNewEntry({ ...newEntry, date: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-muted-foreground">Category</label>
                  <select className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm" value={newEntry.category} onChange={e => setNewEntry({ ...newEntry, category: e.target.value })}>
                    {PETTY_CASH_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select></div>
                <div><label className="text-xs font-medium text-muted-foreground">Payment Method</label>
                  <select className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm" value={newEntry.payment_method} onChange={e => setNewEntry({ ...newEntry, payment_method: e.target.value })}>
                    <option value="cash">Cash</option><option value="ecocash">EcoCash</option><option value="bank_transfer">Bank Transfer</option><option value="card">Card</option>
                  </select></div>
              </div>
              <div><label className="text-xs font-medium text-muted-foreground">Receipt / Reference No.</label>
                <Input placeholder="Optional" value={newEntry.receipt_reference} onChange={e => setNewEntry({ ...newEntry, receipt_reference: e.target.value })} /></div>
              <div><label className="text-xs font-medium text-muted-foreground">Notes</label>
                <Input placeholder="Optional notes" value={newEntry.notes} onChange={e => setNewEntry({ ...newEntry, notes: e.target.value })} /></div>
              <ReceiptImageUpload
                value={newEntry.receipt_image_url || null}
                onChange={(url) => setNewEntry({ ...newEntry, receipt_image_url: url || "" })}
                folder="petty-cash"
              />
              <Button className="w-full" onClick={handleAddPettyCash}><Plus className="w-4 h-4 mr-2" /> Add Entry</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Image preview dialog */}
        <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
          <DialogContent className="max-w-2xl p-2">
            {viewingImage && <img src={viewingImage} alt="Receipt proof" className="w-full rounded-lg" />}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminFinance;

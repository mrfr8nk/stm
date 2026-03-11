import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DollarSign, History, ChevronDown, ChevronUp } from "lucide-react";
import { methodLabel } from "@/components/admin/fees/FeeConstants";

const ParentFees = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<string[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentHistory, setPaymentHistory] = useState<Record<string, any[]>>({});
  const [expandedFee, setExpandedFee] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: links } = await supabase.from("parent_student_links").select("student_id").eq("parent_id", user.id);
      const ids = (links || []).map(l => l.student_id);
      setChildren(ids);

      if (ids.length > 0) {
        const [f, p] = await Promise.all([
          supabase.from("fee_records").select("*").in("student_id", ids).is("deleted_at", null).order("created_at", { ascending: false }),
          supabase.from("profiles").select("*").in("user_id", ids),
        ]);
        setFees(f.data || []);
        setProfiles(p.data || []);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const getName = (uid: string) => profiles.find(p => p.user_id === uid)?.full_name || "Student";

  const loadPaymentHistory = async (feeId: string) => {
    if (expandedFee === feeId) { setExpandedFee(null); return; }
    setExpandedFee(feeId);
    if (paymentHistory[feeId]) return;
    const { data } = await supabase.from("fee_payments").select("*").eq("fee_record_id", feeId).order("created_at", { ascending: true });
    setPaymentHistory(prev => ({ ...prev, [feeId]: data || [] }));
  };

  return (
    <DashboardLayout role="parent">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Children's Fees</h1>

        {loading ? (
          <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : children.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No children linked.</CardContent></Card>
        ) : (
          children.map(childId => {
            const childFees = fees.filter(f => f.student_id === childId);
            const totalDue = childFees.reduce((s, f) => s + Number(f.amount_due), 0);
            const totalPaid = childFees.reduce((s, f) => s + Number(f.amount_paid), 0);
            const balance = totalDue - totalPaid;

            return (
              <Card key={childId}>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5" /> {getName(childId)}</CardTitle>
                    <div className="flex gap-4 text-sm">
                      <span>Due: <strong>${totalDue.toFixed(2)}</strong></span>
                      <span className="text-green-600">Paid: <strong>${totalPaid.toFixed(2)}</strong></span>
                      <span className={balance > 0 ? "text-destructive" : "text-green-600"}>Balance: <strong>${balance.toFixed(2)}</strong></span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year</TableHead><TableHead>Term</TableHead><TableHead>Due</TableHead>
                        <TableHead>Paid</TableHead><TableHead>Balance</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {childFees.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="text-center py-4 text-muted-foreground">No fee records.</TableCell></TableRow>
                      ) : childFees.map(f => {
                        const bal = Number(f.amount_due) - Number(f.amount_paid);
                        const isPaid = bal <= 0;
                        const isExpanded = expandedFee === f.id;
                        const history = paymentHistory[f.id] || [];
                        return (
                          <>
                            <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50" onClick={() => loadPaymentHistory(f.id)}>
                              <TableCell>{f.academic_year}</TableCell>
                              <TableCell>{f.term.replace("_", " ").toUpperCase()}</TableCell>
                              <TableCell>${Number(f.amount_due).toFixed(2)}</TableCell>
                              <TableCell className="text-green-600">${Number(f.amount_paid).toFixed(2)}</TableCell>
                              <TableCell className={bal > 0 ? "text-destructive font-bold" : "text-green-600"}>
                                ${bal.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${isPaid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                  {isPaid ? "Paid" : "Owing"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); loadPaymentHistory(f.id); }}>
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow key={`${f.id}-history`}>
                                <TableCell colSpan={7} className="bg-muted/30 p-0">
                                  <div className="p-3">
                                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                                      <History className="w-3 h-3" /> Individual Payments
                                    </p>
                                    {history.length === 0 ? (
                                      <p className="text-xs text-muted-foreground text-center py-2">No individual payment records.</p>
                                    ) : (
                                      <div className="space-y-1">
                                        {history.map((p: any, i: number) => (
                                          <div key={p.id} className="flex items-center justify-between text-xs bg-background rounded px-3 py-2 border border-border">
                                            <div className="flex items-center gap-3">
                                              <span className="text-muted-foreground font-mono w-5">{i + 1}.</span>
                                              <span>{new Date(p.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                              <span className="text-muted-foreground">{methodLabel(p.payment_method)}</span>
                                              <span className="font-bold text-green-600">${Number(p.amount_usd).toFixed(2)}</span>
                                              <span className="font-mono text-muted-foreground">{p.receipt_number || ""}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
};

export default ParentFees;

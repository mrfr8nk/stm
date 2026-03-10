import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DollarSign, Printer, GraduationCap, History, ChevronDown, ChevronUp } from "lucide-react";
import { printReceipt } from "@/components/admin/fees/ReceiptPrinter";
import { methodLabel, DEFAULT_ZIG_RATE } from "@/components/admin/fees/FeeConstants";

const StudentFees = () => {
  const { user } = useAuth();
  const [fees, setFees] = useState<any[]>([]);
  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState<string | undefined>(undefined);
  const [scholarship, setScholarship] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<Record<string, any[]>>({});
  const [expandedFee, setExpandedFee] = useState<string | null>(null);
  const zigRate = DEFAULT_ZIG_RATE;

  useEffect(() => {
    if (!user) return;
    supabase.from("fee_records").select("*").eq("student_id", user.id).order("academic_year", { ascending: false })
      .then(({ data }) => setFees((data || []).filter((f: any) => !f.deleted_at)));
    supabase.from("profiles").select("full_name").eq("user_id", user.id).single()
      .then(({ data }) => setStudentName(data?.full_name || ""));
    supabase.from("student_profiles").select("class_id").eq("user_id", user.id).single()
      .then(async ({ data }) => {
        if (data?.class_id) {
          const { data: cls } = await supabase.from("classes").select("name, stream").eq("id", data.class_id).single();
          if (cls) setClassName(`${cls.name}${cls.stream ? ` (${cls.stream})` : ""}`);
        }
      });
    supabase.from("scholarships").select("*").eq("student_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(1)
      .then(({ data }) => {
        const active = (data || []).find((s: any) => !s.end_date || new Date(s.end_date) >= new Date());
        setScholarship(active || null);
      });
  }, [user]);

  const loadPaymentHistory = async (feeId: string) => {
    if (expandedFee === feeId) { setExpandedFee(null); return; }
    setExpandedFee(feeId);
    if (paymentHistory[feeId]) return;
    const { data } = await supabase.from("fee_payments" as any).select("*").eq("fee_record_id", feeId).order("created_at", { ascending: true }) as any;
    setPaymentHistory(prev => ({ ...prev, [feeId]: data || [] }));
  };

  const totalDue = fees.reduce((s, f) => s + Number(f.amount_due), 0);
  const totalPaid = fees.reduce((s, f) => s + Number(f.amount_paid), 0);
  const totalBalance = totalDue - totalPaid;

  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Fee Records</h1>

        {scholarship && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <GraduationCap className="w-6 h-6 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-foreground">
                  Scholarship: {scholarship.organization_name}
                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    {scholarship.coverage_type === "full" ? "Fully Sponsored" : `${scholarship.coverage_percentage}% Covered`}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Since {new Date(scholarship.start_date).toLocaleDateString()}
                  {scholarship.end_date && ` • Expires ${new Date(scholarship.end_date).toLocaleDateString()}`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">${totalDue.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">ZIG {(totalDue * zigRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className="text-sm text-muted-foreground">Total Due</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">ZIG {(totalPaid * zigRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className="text-sm text-muted-foreground">Total Paid</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${totalBalance > 0 ? "text-destructive" : "text-green-600"}`}>
                ${totalBalance.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">ZIG {(totalBalance * zigRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              <p className="text-sm text-muted-foreground">Balance</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" /> Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Due (USD)</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.map((f) => {
                  const balance = Number(f.amount_due) - Number(f.amount_paid);
                  const isPaid = balance <= 0;
                  const isExpanded = expandedFee === f.id;
                  const history = paymentHistory[f.id] || [];
                  return (
                    <>
                      <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50" onClick={() => loadPaymentHistory(f.id)}>
                        <TableCell>{f.academic_year}</TableCell>
                        <TableCell>{f.term.replace("_", " ").toUpperCase()}</TableCell>
                        <TableCell>${Number(f.amount_due).toFixed(2)}</TableCell>
                        <TableCell className="text-green-600 font-medium">${Number(f.amount_paid).toFixed(2)}</TableCell>
                        <TableCell className={`font-bold ${isPaid ? "text-green-600" : "text-destructive"}`}>
                          ${balance.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${isPaid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {isPaid ? "Paid" : "Owing"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); loadPaymentHistory(f.id); }} title="Payment History">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                            {f.receipt_number && (
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); printReceipt(f, studentName, zigRate, className); }}>
                                <Printer className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
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
                                        <span className="text-muted-foreground">{new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-muted-foreground">{methodLabel(p.payment_method)}</span>
                                        <span className="font-bold text-green-600">${Number(p.amount_usd).toFixed(2)}</span>
                                        {p.currency === "ZIG" && <span className="text-muted-foreground">(ZIG {Number(p.amount_original).toFixed(0)})</span>}
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
                {fees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No fee records found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentFees;

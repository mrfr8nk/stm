import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DollarSign, Printer, FileDown } from "lucide-react";
import { printReceipt } from "@/components/admin/fees/ReceiptPrinter";
import { methodLabel, DEFAULT_ZIG_RATE } from "@/components/admin/fees/FeeConstants";

const StudentFees = () => {
  const { user } = useAuth();
  const [fees, setFees] = useState<any[]>([]);
  const [studentName, setStudentName] = useState("");
  const zigRate = DEFAULT_ZIG_RATE;

  useEffect(() => {
    if (!user) return;
    supabase.from("fee_records").select("*").eq("student_id", user.id).order("academic_year", { ascending: false })
      .then(({ data }) => setFees((data || []).filter((f: any) => !f.deleted_at)));
    supabase.from("profiles").select("full_name").eq("user_id", user.id).single()
      .then(({ data }) => setStudentName(data?.full_name || ""));
  }, [user]);

  const totalDue = fees.reduce((s, f) => s + Number(f.amount_due), 0);
  const totalPaid = fees.reduce((s, f) => s + Number(f.amount_paid), 0);
  const totalBalance = totalDue - totalPaid;

  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Fee Records</h1>

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
                  <TableHead>Due (ZIG)</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.map((f) => {
                  const balance = Number(f.amount_due) - Number(f.amount_paid);
                  const isPaid = balance <= 0;
                  return (
                    <TableRow key={f.id}>
                      <TableCell>{f.academic_year}</TableCell>
                      <TableCell>{f.term.replace("_", " ").toUpperCase()}</TableCell>
                      <TableCell>${Number(f.amount_due).toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">ZIG {(Number(f.amount_due) * zigRate).toFixed(0)}</TableCell>
                      <TableCell className="text-green-600 font-medium">${Number(f.amount_paid).toFixed(2)}</TableCell>
                      <TableCell className={`font-bold ${isPaid ? "text-green-600" : "text-destructive"}`}>
                        ${balance.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs">{methodLabel((f as any).payment_method)}</TableCell>
                      <TableCell className="text-xs font-mono">{f.receipt_number || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {f.payment_date ? new Date(f.payment_date).toLocaleDateString() : "—"}
                        <span className="text-xs text-muted-foreground ml-1">{new Date(f.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${isPaid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {isPaid ? "Paid" : "Owing"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {f.receipt_number && (
                          <Button variant="ghost" size="sm" onClick={() => printReceipt(f, studentName, zigRate)}>
                            <Printer className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {fees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">No fee records found.</TableCell>
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

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { DollarSign } from "lucide-react";

const ZIG_RATE = 28.5;

const StudentFees = () => {
  const { user } = useAuth();
  const [fees, setFees] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("fee_records").select("*").eq("student_id", user.id).order("academic_year", { ascending: false })
      .then(({ data }) => setFees(data || []));
  }, [user]);

  const totalDue = fees.reduce((s, f) => s + Number(f.amount_due), 0);
  const totalPaid = fees.reduce((s, f) => s + Number(f.amount_paid), 0);

  const methodLabel = (m: string) => {
    const map: Record<string, string> = { cash: "Cash", bank_transfer: "Bank Transfer", ecocash: "EcoCash", innbucks: "InnBucks", zipit: "ZIPIT", swipe: "Swipe/POS", cheque: "Cheque", other: "Other" };
    return map[m] || m || "—";
  };

  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Fee Records</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">${totalDue.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">ZIG {(totalDue * ZIG_RATE).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            <p className="text-sm text-muted-foreground">Total Due</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">ZIG {(totalPaid * ZIG_RATE).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            <p className="text-sm text-muted-foreground">Total Paid</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">${(totalDue - totalPaid).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">ZIG {((totalDue - totalPaid) * ZIG_RATE).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            <p className="text-sm text-muted-foreground">Balance</p>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5" /> Payment History</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow><TableHead>Year</TableHead><TableHead>Term</TableHead><TableHead>Due (USD)</TableHead><TableHead>Due (ZIG)</TableHead><TableHead>Paid</TableHead><TableHead>Balance</TableHead><TableHead>Method</TableHead><TableHead>Receipt</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {fees.map(f => (
                  <TableRow key={f.id}>
                    <TableCell>{f.academic_year}</TableCell>
                    <TableCell>{f.term.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}</TableCell>
                    <TableCell>${Number(f.amount_due).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">ZIG {(Number(f.amount_due) * ZIG_RATE).toFixed(0)}</TableCell>
                    <TableCell className="text-green-600">${Number(f.amount_paid).toFixed(2)}</TableCell>
                    <TableCell className="text-destructive">${(Number(f.amount_due) - Number(f.amount_paid)).toFixed(2)}</TableCell>
                    <TableCell className="text-xs">{methodLabel((f as any).payment_method)}</TableCell>
                    <TableCell>{f.receipt_number || "—"}</TableCell>
                  </TableRow>
                ))}
                {fees.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No fee records.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentFees;

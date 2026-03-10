import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { methodLabel } from "./FeeConstants";
import { History } from "lucide-react";

interface Props {
  feeRecordId: string | null;
  studentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zigRate: number;
}

const PaymentHistoryDialog = ({ feeRecordId, studentName, open, onOpenChange, zigRate }: Props) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!feeRecordId || !open) return;
    setLoading(true);
    supabase.from("fee_payments" as any).select("*").eq("fee_record_id", feeRecordId).order("created_at", { ascending: true })
      .then(({ data }: any) => { setPayments(data || []); setLoading(false); });
  }, [feeRecordId, open]);

  const total = payments.reduce((s: number, p: any) => s + Number(p.amount_usd), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" /> Payment History — {studentName}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
        ) : payments.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">No individual payments recorded yet.</p>
        ) : (
          <div className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p: any, i: number) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(p.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      <span className="text-xs text-muted-foreground ml-1">
                        {new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-green-600">${Number(p.amount_usd).toFixed(2)}</span>
                      {p.currency === "ZIG" && (
                        <span className="text-xs text-muted-foreground ml-1">(ZIG {Number(p.amount_original).toFixed(0)})</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{methodLabel(p.payment_method)}</TableCell>
                    <TableCell className="text-xs font-mono">{p.receipt_number || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-between px-2 text-sm font-bold border-t border-border pt-2">
              <span>Total Paid ({payments.length} payment{payments.length !== 1 ? "s" : ""})</span>
              <span className="text-green-600">${total.toFixed(2)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentHistoryDialog;

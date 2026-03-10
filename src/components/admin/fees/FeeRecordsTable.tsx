import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Receipt, Edit, Trash2, Printer, History } from "lucide-react";
import { methodLabel } from "./FeeConstants";
import PaymentHistoryDialog from "./PaymentHistoryDialog";

interface Props {
  records: any[];
  loading: boolean;
  zigRate: number;
  getStudentName: (id: string) => string;
  onPay: (record: any) => void;
  onEdit: (record: any) => void;
  onDelete: (id: string) => void;
  onPrintReceipt: (record: any) => void;
}

const FeeRecordsTable = ({ records, loading, zigRate, getStudentName, onPay, onEdit, onDelete, onPrintReceipt }: Props) => {
  const [historyRecord, setHistoryRecord] = useState<any>(null);

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Due (USD)</TableHead>
                <TableHead>Due (ZIG)</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : records.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No records found.</TableCell></TableRow>
              ) : records.map((f) => {
                const balance = Number(f.amount_due) - Number(f.amount_paid);
                const isPaid = balance <= 0;
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{getStudentName(f.student_id)}</TableCell>
                    <TableCell>{f.academic_year}</TableCell>
                    <TableCell>{f.term.replace("_", " ").toUpperCase()}</TableCell>
                    <TableCell>${Number(f.amount_due).toFixed(2)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">ZIG {(Number(f.amount_due) * zigRate).toFixed(0)}</TableCell>
                    <TableCell className="text-green-600 font-medium">${Number(f.amount_paid).toFixed(2)}</TableCell>
                    <TableCell className={`font-bold ${isPaid ? "text-green-600" : "text-destructive"}`}>
                      ${balance.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs">{methodLabel((f as any).payment_method || "cash")}</TableCell>
                    <TableCell className="text-xs font-mono">{f.receipt_number || "—"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${isPaid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {isPaid ? "Paid" : "Owing"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {!isPaid && (
                          <Button variant="default" size="sm" onClick={() => onPay(f)} title="Record Payment" className="gap-1">
                            <Receipt className="w-4 h-4" />
                            <span className="hidden sm:inline text-xs">Pay</span>
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => setHistoryRecord(f)} title="Payment History">
                          <History className="w-4 h-4 text-primary" />
                        </Button>
                        {f.receipt_number && (
                          <Button variant="ghost" size="sm" onClick={() => onPrintReceipt(f)} title="Print Receipt">
                            <Printer className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => onEdit(f)} title="Edit">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onDelete(f.id)} title="Delete">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PaymentHistoryDialog
        feeRecordId={historyRecord?.id || null}
        studentName={historyRecord ? getStudentName(historyRecord.student_id) : ""}
        open={!!historyRecord}
        onOpenChange={(o) => { if (!o) setHistoryRecord(null); }}
        zigRate={zigRate}
      />
    </>
  );
};

export default FeeRecordsTable;

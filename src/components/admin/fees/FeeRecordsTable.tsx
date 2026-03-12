import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Receipt, Edit, Trash2, Printer, History, ArrowUpDown, ArrowUp, ArrowDown, Search } from "lucide-react";
import { methodLabel } from "./FeeConstants";
import PaymentHistoryDialog from "./PaymentHistoryDialog";
import ExportDropdown from "@/components/ExportDropdown";

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

type SortKey = "student" | "year" | "term" | "due" | "paid" | "balance" | "status";
type SortDir = "asc" | "desc";

const FeeRecordsTable = ({ records, loading, zigRate, getStudentName, onPay, onEdit, onDelete, onPrintReceipt }: Props) => {
  const [historyRecord, setHistoryRecord] = useState<any>(null);
  const [sortKey, setSortKey] = useState<SortKey>("student");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [tableSearch, setTableSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "owing">("all");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 inline opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 ml-1 inline text-primary" /> : <ArrowDown className="w-3 h-3 ml-1 inline text-primary" />;
  };

  const filtered = useMemo(() => {
    let list = records;
    if (tableSearch) {
      const q = tableSearch.toLowerCase();
      list = list.filter(f =>
        getStudentName(f.student_id).toLowerCase().includes(q) ||
        (f.receipt_number || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter(f => {
        const bal = Number(f.amount_due) - Number(f.amount_paid);
        return statusFilter === "paid" ? bal <= 0 : bal > 0;
      });
    }
    return list;
  }, [records, tableSearch, statusFilter, getStudentName]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      const balA = Number(a.amount_due) - Number(a.amount_paid);
      const balB = Number(b.amount_due) - Number(b.amount_paid);
      switch (sortKey) {
        case "student": cmp = getStudentName(a.student_id).localeCompare(getStudentName(b.student_id)); break;
        case "year": cmp = a.academic_year - b.academic_year; break;
        case "term": cmp = a.term.localeCompare(b.term); break;
        case "due": cmp = Number(a.amount_due) - Number(b.amount_due); break;
        case "paid": cmp = Number(a.amount_paid) - Number(b.amount_paid); break;
        case "balance": cmp = balA - balB; break;
        case "status": cmp = (balA <= 0 ? 0 : 1) - (balB <= 0 ? 0 : 1); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, getStudentName]);

  const exportRows = sorted.map(f => {
    const balance = Number(f.amount_due) - Number(f.amount_paid);
    return [
      getStudentName(f.student_id),
      f.academic_year,
      f.term.replace("_", " ").toUpperCase(),
      `$${Number(f.amount_due).toFixed(2)}`,
      `ZIG ${(Number(f.amount_due) * zigRate).toFixed(0)}`,
      `$${Number(f.amount_paid).toFixed(2)}`,
      `$${balance.toFixed(2)}`,
      methodLabel(f.payment_method || "cash"),
      f.receipt_number || "—",
      balance <= 0 ? "Paid" : "Owing",
      f.payment_date || "—",
    ];
  });

  return (
    <>
      {/* Table Controls */}
      <Card className="mb-2">
        <CardContent className="p-3 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3 items-center flex-1 min-w-[200px]">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Filter records..." value={tableSearch} onChange={e => setTableSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <select className="border border-input rounded-lg px-3 py-1.5 bg-background text-sm h-9" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
              <option value="all">All Status</option>
              <option value="paid">Paid Only</option>
              <option value="owing">Owing Only</option>
            </select>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-muted-foreground">{sorted.length} records</span>
            <ExportDropdown
              title="Fee Records"
              filename="fee_records"
              headers={["Student", "Year", "Term", "Due (USD)", "Due (ZIG)", "Paid", "Balance", "Method", "Receipt", "Status", "Date"]}
              rows={exportRows}
              disabled={sorted.length === 0}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("student")}>Student <SortIcon col="student" /></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("year")}>Year <SortIcon col="year" /></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("term")}>Term <SortIcon col="term" /></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("due")}>Due (USD) <SortIcon col="due" /></TableHead>
                <TableHead>Due (ZIG)</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("paid")}>Paid <SortIcon col="paid" /></TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("balance")}>Balance <SortIcon col="balance" /></TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("status")}>Status <SortIcon col="status" /></TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : sorted.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No records found.</TableCell></TableRow>
              ) : sorted.map((f) => {
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
                    <TableCell className="text-xs">{methodLabel(f.payment_method || "cash")}</TableCell>
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

import { methodLabel } from "./FeeConstants";

export const printReceipt = (record: any, studentName: string, zigRate: number, className?: string) => {
  const balance = Number(record.amount_due) - Number(record.amount_paid);
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return;

  w.document.write(`
    <html>
    <head><title>Receipt ${record.receipt_number}</title>
    <style>
      body { font-family: 'Courier New', monospace; max-width: 350px; margin: 20px auto; font-size: 13px; }
      .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
      .header h2 { margin: 0; font-size: 16px; }
      .header p { margin: 2px 0; font-size: 11px; }
      .row { display: flex; justify-content: space-between; padding: 3px 0; }
      .row.total { border-top: 1px solid #000; font-weight: bold; margin-top: 5px; padding-top: 5px; }
      .footer { text-align: center; border-top: 2px dashed #000; padding-top: 10px; margin-top: 15px; font-size: 10px; }
      @media print { body { margin: 0; } }
    </style>
    </head>
    <body>
      <div class="header">
        <h2>ST. MARY'S HIGH SCHOOL</h2>
        <p>Fee Payment Receipt</p>
        <p>Receipt No: <strong>${record.receipt_number}</strong></p>
      </div>
      <div class="row"><span>Date:</span><span>${record.payment_date || new Date().toLocaleDateString()}</span></div>
      <div class="row"><span>Student:</span><span>${studentName}</span></div>
      ${className ? `<div class="row"><span>Class:</span><span>${className}</span></div>` : ""}
      <div class="row"><span>Year:</span><span>${record.academic_year}</span></div>
      <div class="row"><span>Term:</span><span>${record.term.replace("_", " ").toUpperCase()}</span></div>
      <div class="row"><span>Method:</span><span>${methodLabel((record as any).payment_method || "cash")}</span></div>
      <br/>
      <div class="row"><span>Total Fees:</span><span>$${Number(record.amount_due).toFixed(2)}</span></div>
      <div class="row"><span></span><span style="font-size:10px;color:#666">ZIG ${(Number(record.amount_due) * zigRate).toFixed(0)}</span></div>
      <div class="row"><span>Amount Paid:</span><span>$${Number(record.amount_paid).toFixed(2)}</span></div>
      <div class="row total"><span>Balance:</span><span>${balance <= 0 ? "PAID IN FULL" : "$" + balance.toFixed(2)}</span></div>
      ${balance > 0 ? `<div class="row"><span></span><span style="font-size:10px;color:#666">ZIG ${(balance * zigRate).toFixed(0)}</span></div>` : ""}
      <div class="footer">
        <p>Thank you for your payment</p>
        <p>This is a computer-generated receipt</p>
      </div>
      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `);
  w.document.close();
};

export const generateCSVReport = (records: any[], getStudentName: (id: string) => string, zigRate: number) => {
  const headers = ["Student", "Year", "Term", "Due (USD)", "Due (ZIG)", "Paid (USD)", "Balance (USD)", "Method", "Receipt", "Status", "Date"];
  const rows = records.map((r) => {
    const balance = Number(r.amount_due) - Number(r.amount_paid);
    return [
      getStudentName(r.student_id),
      r.academic_year,
      r.term.replace("_", " "),
      Number(r.amount_due).toFixed(2),
      (Number(r.amount_due) * zigRate).toFixed(0),
      Number(r.amount_paid).toFixed(2),
      balance.toFixed(2),
      methodLabel((r as any).payment_method || "cash"),
      r.receipt_number || "",
      balance <= 0 ? "Paid" : "Owing",
      r.payment_date || "",
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `fee-report-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

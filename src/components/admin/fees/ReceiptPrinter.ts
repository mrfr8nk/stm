import { methodLabel } from "./FeeConstants";

/**
 * Generate a Code128B barcode as SVG path data
 * Encodes alphanumeric receipt numbers for scanner compatibility
 */
const generateBarcodeSVG = (text: string): string => {
  // Code 128B encoding table (subset for alphanumeric)
  const CODE128B: Record<string, number[]> = {};
  const START_B = [2,1,1,2,1,4];
  const STOP = [2,3,3,1,1,1,2];
  
  // Build encoding patterns for printable ASCII (space to DEL)
  const patterns = [
    [2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],
    [1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],
    [2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],
    [1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],
    [2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],
    [3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],
    [2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],
    [1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],
    [2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],
    [1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],
    [2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],
    [3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],
    [3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],
    [1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],
    [1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],
    [2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],
    [1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],
    [1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],
    [2,1,4,1,2,1],[4,1,2,1,2,1],
  ];
  
  for (let i = 0; i < 95; i++) {
    CODE128B[String.fromCharCode(32 + i)] = patterns[i] || patterns[0];
  }

  // Build barcode bars
  let allBars: number[] = [...START_B];
  let checksum = 104; // Start B value
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const val = char.charCodeAt(0) - 32;
    const pattern = CODE128B[char] || patterns[0];
    allBars.push(...pattern);
    checksum += val * (i + 1);
  }
  
  // Add checksum character
  const checksumChar = checksum % 103;
  allBars.push(...(patterns[checksumChar] || patterns[0]));
  allBars.push(...STOP);

  // Render as SVG
  const barWidth = 1.5;
  let x = 0;
  let svgBars = '';
  for (let i = 0; i < allBars.length; i++) {
    const w = allBars[i] * barWidth;
    if (i % 2 === 0) {
      svgBars += `<rect x="${x}" y="0" width="${w}" height="50" fill="#000"/>`;
    }
    x += w;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${x}" height="50" viewBox="0 0 ${x} 50">${svgBars}</svg>`;
};

/** Generate a unique serial number for each receipt print */
const generateSerial = (receiptNumber: string): string => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SER-${ts}-${rand}`;
};

export const printReceipt = (record: any, studentName: string, zigRate: number, className?: string) => {
  const balance = Number(record.amount_due) - Number(record.amount_paid);
  const serial = generateSerial(record.receipt_number || "");
  const barcodeData = record.receipt_number || serial;
  const barcodeSvg = generateBarcodeSVG(barcodeData);
  const printDate = new Date().toLocaleString();
  const paymentDate = record.payment_date
    ? new Date(record.payment_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const w = window.open("", "_blank", "width=500,height=750");
  if (!w) return;

  w.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt ${record.receipt_number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      max-width: 420px;
      margin: 0 auto;
      padding: 24px 20px;
      font-size: 13px;
      color: #1a1a1a;
      background: #fff;
    }

    .receipt {
      border: 2px solid #1a1a1a;
      border-radius: 8px;
      overflow: hidden;
    }

    .receipt-header {
      background: #1a1a1a;
      color: #fff;
      text-align: center;
      padding: 20px 16px 16px;
    }

    .receipt-header .school-name {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .receipt-header .school-sub {
      font-size: 10px;
      letter-spacing: 1px;
      color: #ccc;
      text-transform: uppercase;
    }

    .receipt-badge {
      display: inline-block;
      background: #fff;
      color: #1a1a1a;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 14px;
      border-radius: 20px;
      margin-top: 12px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .receipt-meta {
      display: flex;
      justify-content: space-between;
      padding: 12px 16px;
      background: #f5f5f5;
      border-bottom: 1px solid #e0e0e0;
      font-size: 11px;
      color: #666;
    }

    .receipt-meta strong { color: #1a1a1a; }

    .receipt-body { padding: 16px; }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 16px;
    }

    .info-item {
      padding: 8px 10px;
      background: #f9f9f9;
      border-radius: 6px;
      border: 1px solid #eee;
    }

    .info-item .label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #888;
      font-weight: 600;
      margin-bottom: 2px;
    }

    .info-item .value {
      font-size: 13px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .info-item.full { grid-column: 1 / -1; }

    .divider {
      border: none;
      border-top: 1px dashed #ccc;
      margin: 14px 0;
    }

    .amount-section { margin-bottom: 14px; }

    .amount-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      font-size: 13px;
    }

    .amount-row .amt-label { color: #555; }
    .amount-row .amt-value { font-weight: 600; }
    .amount-row .zig { font-size: 10px; color: #888; font-weight: 400; }

    .amount-row.total-row {
      background: #f0f7f0;
      margin: 8px -16px 0;
      padding: 12px 16px;
      border-top: 2px solid #1a1a1a;
      font-size: 15px;
    }

    .amount-row.total-row .amt-value { font-weight: 700; }
    .amount-row.total-row.owing { background: #fef2f2; }
    .amount-row.total-row.owing .amt-value { color: #dc2626; }

    .paid-stamp {
      text-align: center;
      margin: 12px 0;
    }

    .paid-stamp span {
      display: inline-block;
      border: 3px solid #16a34a;
      color: #16a34a;
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 4px;
      padding: 4px 20px;
      border-radius: 6px;
      transform: rotate(-3deg);
      text-transform: uppercase;
    }

    .barcode-section {
      text-align: center;
      padding: 16px;
      border-top: 1px dashed #ccc;
      background: #fafafa;
    }

    .barcode-section svg {
      display: block;
      margin: 0 auto 6px;
      max-width: 240px;
      height: 45px;
    }

    .barcode-section .barcode-text {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      letter-spacing: 2px;
      color: #333;
      font-weight: 600;
    }

    .serial-row {
      font-size: 9px;
      color: #999;
      margin-top: 4px;
      letter-spacing: 0.5px;
    }

    .receipt-footer {
      text-align: center;
      padding: 14px 16px;
      border-top: 1px solid #e0e0e0;
      background: #fafafa;
    }

    .receipt-footer p {
      font-size: 10px;
      color: #888;
      line-height: 1.6;
    }

    .receipt-footer .thank-you {
      font-size: 12px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 4px;
    }

    .watermark {
      font-size: 8px;
      color: #bbb;
      margin-top: 8px;
      text-align: center;
      letter-spacing: 0.3px;
    }

    @media print {
      body { padding: 0; }
      .receipt { border-width: 1px; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="receipt-header">
      <div class="school-name">St. Mary's High School</div>
      <div class="school-sub">We Think We Can and Indeed We Can</div>
      <div class="receipt-badge">Fee Payment Receipt</div>
    </div>

    <div class="receipt-meta">
      <span>Receipt: <strong>${record.receipt_number || "—"}</strong></span>
      <span>Date: <strong>${paymentDate}</strong></span>
    </div>

    <div class="receipt-body">
      <div class="info-grid">
        <div class="info-item full">
          <div class="label">Student Name</div>
          <div class="value">${studentName}</div>
        </div>
        ${className ? `
        <div class="info-item">
          <div class="label">Class</div>
          <div class="value">${className}</div>
        </div>` : ""}
        <div class="info-item">
          <div class="label">Academic Year</div>
          <div class="value">${record.academic_year}</div>
        </div>
        <div class="info-item">
          <div class="label">Term</div>
          <div class="value">${record.term.replace("_", " ").toUpperCase()}</div>
        </div>
        <div class="info-item">
          <div class="label">Payment Method</div>
          <div class="value">${methodLabel((record as any).payment_method || "cash")}</div>
        </div>
      </div>

      <hr class="divider" />

      <div class="amount-section">
        <div class="amount-row">
          <span class="amt-label">Total Fees Due</span>
          <span class="amt-value">$${Number(record.amount_due).toFixed(2)} <span class="zig">(ZIG ${(Number(record.amount_due) * zigRate).toLocaleString(undefined, { maximumFractionDigits: 0 })})</span></span>
        </div>
        <div class="amount-row">
          <span class="amt-label">Amount Paid</span>
          <span class="amt-value" style="color:#16a34a">$${Number(record.amount_paid).toFixed(2)}</span>
        </div>
        <div class="amount-row total-row ${balance > 0 ? "owing" : ""}">
          <span class="amt-label"><strong>Balance</strong></span>
          <span class="amt-value">${balance <= 0 ? "$0.00" : "$" + balance.toFixed(2)}${balance > 0 ? ` <span class="zig">(ZIG ${(balance * zigRate).toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>` : ""}</span>
        </div>
      </div>

      ${balance <= 0 ? `
      <div class="paid-stamp">
        <span>Paid in Full</span>
      </div>` : ""}
    </div>

    <div class="barcode-section">
      ${barcodeSvg}
      <div class="barcode-text">${barcodeData}</div>
      <div class="serial-row">Serial: ${serial} &bull; Printed: ${printDate}</div>
    </div>

    <div class="receipt-footer">
      <p class="thank-you">Thank you for your payment</p>
      <p>This is a computer-generated receipt and is valid without signature.<br/>
      For queries, contact the accounts office.</p>
    </div>
  </div>

  <div class="watermark">St. Mary's High School &mdash; Fee Management System</div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`);
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

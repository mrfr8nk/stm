import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, CheckCircle2, XCircle, ShieldCheck, Receipt, FileText } from "lucide-react";
import { methodLabel } from "@/components/admin/fees/FeeConstants";

interface Props {
  role: "student" | "teacher" | "parent";
}

const VerifyDocuments = ({ role }: Props) => {
  // Report verification
  const [serial, setSerial] = useState("");
  const [reportResult, setReportResult] = useState<any>(null);
  const [reportNotFound, setReportNotFound] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  // Receipt verification
  const [receiptNum, setReceiptNum] = useState("");
  const [receiptResult, setReceiptResult] = useState<any>(null);
  const [receiptNotFound, setReceiptNotFound] = useState(false);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptStudentName, setReceiptStudentName] = useState("");

  const verifyReport = async () => {
    const s = serial.trim();
    if (!s) return;
    setReportLoading(true);
    setReportNotFound(false);
    setReportResult(null);

    const { data } = await supabase.from("report_verifications").select("*").eq("serial_number", s).single();
    if (data) setReportResult(data);
    else setReportNotFound(true);
    setReportLoading(false);
  };

  const verifyReceipt = async () => {
    const r = receiptNum.trim();
    if (!r) return;
    setReceiptLoading(true);
    setReceiptNotFound(false);
    setReceiptResult(null);
    setReceiptStudentName("");

    const { data } = await supabase.from("fee_records").select("*").eq("receipt_number", r).single();
    if (data) {
      setReceiptResult(data);
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", (data as any).student_id).single();
      setReceiptStudentName(profile?.full_name || "Student");
    } else {
      setReceiptNotFound(true);
    }
    setReceiptLoading(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
        <ShieldCheck className="w-6 h-6 text-primary" /> Verify Documents
      </h1>

      <Tabs defaultValue="receipt">
        <TabsList>
          <TabsTrigger value="receipt" className="gap-1"><Receipt className="w-4 h-4" /> Receipt</TabsTrigger>
          <TabsTrigger value="report" className="gap-1"><FileText className="w-4 h-4" /> Report Card</TabsTrigger>
        </TabsList>

        <TabsContent value="receipt">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Verify Fee Receipt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Enter the receipt number printed on the fee payment receipt to verify its authenticity.</p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. REC-20260310-ABC12"
                  value={receiptNum}
                  onChange={e => setReceiptNum(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && verifyReceipt()}
                />
                <Button onClick={verifyReceipt} disabled={receiptLoading}>
                  <Search className="w-4 h-4 mr-1" /> Verify
                </Button>
              </div>

              {receiptLoading && (
                <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
              )}

              {receiptResult && (
                <div className="border border-green-500/30 bg-green-500/5 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="font-bold text-lg">Receipt Verified ✓</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Receipt:</span> <strong>{receiptResult.receipt_number}</strong></div>
                    <div><span className="text-muted-foreground">Student:</span> <strong>{receiptStudentName}</strong></div>
                    <div><span className="text-muted-foreground">Year:</span> <strong>{receiptResult.academic_year}</strong></div>
                    <div><span className="text-muted-foreground">Term:</span> <strong>{receiptResult.term?.replace("_", " ").toUpperCase()}</strong></div>
                    <div><span className="text-muted-foreground">Amount Due:</span> <strong>${Number(receiptResult.amount_due).toFixed(2)}</strong></div>
                    <div><span className="text-muted-foreground">Amount Paid:</span> <strong className="text-green-600">${Number(receiptResult.amount_paid).toFixed(2)}</strong></div>
                    <div><span className="text-muted-foreground">Method:</span> <strong>{methodLabel(receiptResult.payment_method)}</strong></div>
                    <div><span className="text-muted-foreground">Date:</span> <strong>{receiptResult.payment_date ? new Date(receiptResult.payment_date).toLocaleDateString() : "—"}</strong></div>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">Authentic Receipt</Badge>
                </div>
              )}

              {receiptNotFound && (
                <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-4 flex items-center gap-3">
                  <XCircle className="w-6 h-6 text-destructive shrink-0" />
                  <div>
                    <p className="font-bold text-destructive">Receipt Not Found</p>
                    <p className="text-sm text-destructive/80">This receipt number does not match any record. The document may be fraudulent.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="report">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Verify Report Card</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Enter the serial number from the report card or scan the QR code to verify its authenticity.</p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. RPT-2026-T1-ABC123"
                  value={serial}
                  onChange={e => setSerial(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && verifyReport()}
                />
                <Button onClick={verifyReport} disabled={reportLoading}>
                  <Search className="w-4 h-4 mr-1" /> Verify
                </Button>
              </div>

              {reportLoading && (
                <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
              )}

              {reportResult && (
                <div className="border border-green-500/30 bg-green-500/5 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="font-bold text-lg">Report Card Verified ✓</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Serial:</span> <strong>{reportResult.serial_number}</strong></div>
                    <div><span className="text-muted-foreground">Student:</span> <strong>{reportResult.student_name}</strong></div>
                    <div><span className="text-muted-foreground">Student ID:</span> <strong>{reportResult.student_code || "—"}</strong></div>
                    <div><span className="text-muted-foreground">Class:</span> <strong>{reportResult.class_name || "—"}</strong></div>
                    <div><span className="text-muted-foreground">Level:</span> <strong>{reportResult.level?.replace("_", " ").toUpperCase() || "—"}</strong></div>
                    <div><span className="text-muted-foreground">Term:</span> <strong>{reportResult.term} {reportResult.academic_year}</strong></div>
                    <div><span className="text-muted-foreground">Average:</span> <strong>{reportResult.average_mark}%</strong></div>
                    <div><span className="text-muted-foreground">Subjects:</span> <strong>{reportResult.subjects_count}</strong></div>
                    {reportResult.position && (
                      <div><span className="text-muted-foreground">Position:</span> <strong>{reportResult.position} / {reportResult.total_students}</strong></div>
                    )}
                    <div><span className="text-muted-foreground">Generated:</span> <strong>{new Date(reportResult.generated_at).toLocaleDateString()}</strong></div>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">Authentic Document</Badge>
                </div>
              )}

              {reportNotFound && (
                <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-4 flex items-center gap-3">
                  <XCircle className="w-6 h-6 text-destructive shrink-0" />
                  <div>
                    <p className="font-bold text-destructive">Report Not Found</p>
                    <p className="text-sm text-destructive/80">This serial number does not match any report. The document may be fraudulent.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VerifyDocuments;

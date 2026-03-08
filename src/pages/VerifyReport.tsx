import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle2, XCircle, ShieldCheck, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import schoolLogo from "@/assets/school-logo.png";

const VerifyReport = () => {
  const [serial, setSerial] = useState("");
  const [result, setResult] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  // Try to parse QR data from URL on mount
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("serial");
    if (s) {
      setSerial(s);
      handleVerify(s);
    }
  });

  async function handleVerify(serialToCheck?: string) {
    const s = (serialToCheck || serial).trim();
    if (!s) return;
    setLoading(true);
    setNotFound(false);
    setResult(null);

    const { data } = await supabase
      .from("report_verifications")
      .select("*")
      .eq("serial_number", s)
      .single();

    if (data) {
      setResult(data);
    } else {
      setNotFound(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <img src={schoolLogo} alt="School Logo" className="w-16 h-16 mx-auto rounded-full border-2 border-primary object-contain bg-white p-1" />
          <h1 className="text-2xl font-bold text-foreground">St. Mary's High School</h1>
          <p className="text-muted-foreground text-sm">Report Card Verification System</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="w-5 h-5 text-primary" /> Verify Report Card
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the serial number from the report card or scan the QR code to verify its authenticity.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. RPT-2026-T1-ABC123"
                value={serial}
                onChange={e => setSerial(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleVerify()}
              />
              <Button onClick={() => handleVerify()} disabled={loading}>
                <Search className="w-4 h-4 mr-1" /> Verify
              </Button>
            </div>

            {loading && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            )}

            {result && (
              <div className="border border-green-500/30 bg-green-500/5 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="font-bold text-lg">Report Card Verified ✓</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Serial:</span> <strong>{result.serial_number}</strong></div>
                  <div><span className="text-muted-foreground">Student:</span> <strong>{result.student_name}</strong></div>
                  <div><span className="text-muted-foreground">Student ID:</span> <strong>{result.student_code || "—"}</strong></div>
                  <div><span className="text-muted-foreground">Class:</span> <strong>{result.class_name || "—"}</strong></div>
                  <div><span className="text-muted-foreground">Level:</span> <strong>{result.level?.replace("_", " ").toUpperCase() || "—"}</strong></div>
                  <div><span className="text-muted-foreground">Term:</span> <strong>{result.term} {result.academic_year}</strong></div>
                  <div><span className="text-muted-foreground">Average:</span> <strong>{result.average_mark}%</strong></div>
                  <div><span className="text-muted-foreground">Subjects:</span> <strong>{result.subjects_count}</strong></div>
                  {result.position && (
                    <div><span className="text-muted-foreground">Position:</span> <strong>{result.position} / {result.total_students}</strong></div>
                  )}
                  <div><span className="text-muted-foreground">Generated:</span> <strong>{new Date(result.generated_at).toLocaleDateString()}</strong></div>
                </div>
                <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
                  Authentic Document
                </Badge>
              </div>
            )}

            {notFound && (
              <div className="border border-destructive/30 bg-destructive/5 rounded-lg p-4 flex items-center gap-3">
                <XCircle className="w-6 h-6 text-destructive" />
                <div>
                  <p className="font-bold text-destructive">Report Not Found</p>
                  <p className="text-sm text-destructive/80">This serial number does not match any report in our system. The document may be fraudulent.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Link to="/" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Back to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyReport;

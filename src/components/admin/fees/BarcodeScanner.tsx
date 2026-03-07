import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScanLine, Camera, Keyboard, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: any[];
  studentProfiles: any[];
  classes: any[];
}

interface VerifyResult {
  valid: boolean;
  record?: any;
  studentName?: string;
  className?: string;
  balance?: number;
}

const BarcodeScanner = ({ open, onOpenChange, students, studentProfiles, classes }: BarcodeScannerProps) => {
  const [mode, setMode] = useState<"camera" | "manual">("manual");
  const [manualCode, setManualCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-focus input for barcode scanner gun support
  useEffect(() => {
    if (open && mode === "manual") {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, mode]);

  // Camera mode with BarcodeDetector API
  useEffect(() => {
    if (!open || mode !== "camera") {
      // Cleanup stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      return;
    }

    let active = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Check if BarcodeDetector is available
        if ("BarcodeDetector" in window) {
          const detector = new (window as any).BarcodeDetector({ formats: ["code_128", "code_39", "ean_13", "qr_code"] });
          const scan = async () => {
            if (!active || !videoRef.current) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                const code = barcodes[0].rawValue;
                if (code) {
                  await verifyReceipt(code);
                  return; // Stop scanning after first detection
                }
              }
            } catch { /* ignore detection errors */ }
            if (active) requestAnimationFrame(scan);
          };
          scan();
        }
      } catch (err) {
        console.error("Camera error:", err);
        setMode("manual");
      }
    };

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [open, mode]);

  const getStudentName = (userId: string) => students.find(s => s.user_id === userId)?.full_name || "Unknown";

  const getClassName = (userId: string) => {
    const sp = studentProfiles.find(s => s.user_id === userId);
    if (!sp?.class_id) return "—";
    const cls = classes.find(c => c.id === sp.class_id);
    return cls ? `${cls.name}${cls.stream ? ` (${cls.stream})` : ""}` : "—";
  };

  const verifyReceipt = useCallback(async (code: string) => {
    if (!code.trim()) return;
    setVerifying(true);
    setResult(null);

    const { data, error } = await supabase
      .from("fee_records")
      .select("*")
      .eq("receipt_number", code.trim())
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) {
      setResult({ valid: false });
    } else {
      // Get student total balance
      const { data: allFees } = await supabase
        .from("fee_records")
        .select("amount_due, amount_paid")
        .eq("student_id", data.student_id)
        .is("deleted_at", null);

      const balance = (allFees || []).reduce((acc, f) => acc + Number(f.amount_due) - Number(f.amount_paid), 0);

      setResult({
        valid: true,
        record: data,
        studentName: getStudentName(data.student_id),
        className: getClassName(data.student_id),
        balance,
      });
    }
    setVerifying(false);
  }, [students, studentProfiles, classes]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyReceipt(manualCode);
  };

  // Handle barcode scanner gun (rapid key entry ending with Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      verifyReceipt(manualCode);
    }
  };

  const reset = () => {
    setManualCode("");
    setResult(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setResult(null); setManualCode(""); setMode("manual"); } onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-primary" />
            Receipt Barcode Verification
          </DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={mode === "manual" ? "default" : "outline"}
            size="sm"
            onClick={() => { setMode("manual"); setResult(null); }}
            className="flex-1"
          >
            <Keyboard className="w-4 h-4 mr-1" /> Manual / Scanner Gun
          </Button>
          <Button
            variant={mode === "camera" ? "default" : "outline"}
            size="sm"
            onClick={() => { setMode("camera"); setResult(null); }}
            className="flex-1"
          >
            <Camera className="w-4 h-4 mr-1" /> Camera Scan
          </Button>
        </div>

        {/* Manual / Scanner gun input */}
        {mode === "manual" && (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Type or scan the receipt number using a barcode scanner gun. The field auto-submits on Enter.
            </p>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. RCP-20260301-A1B2C3"
                className="font-mono"
                autoFocus
              />
              <Button type="submit" disabled={verifying || !manualCode.trim()}>
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
              </Button>
            </div>
          </form>
        )}

        {/* Camera mode */}
        {mode === "camera" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Point your camera at the receipt barcode. Detection is automatic.
            </p>
            <div className="relative rounded-lg overflow-hidden bg-muted aspect-video">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              {/* Scan line animation */}
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-primary/70 animate-pulse" />
              <div className="absolute inset-4 border-2 border-primary/30 rounded-lg pointer-events-none" />
            </div>
            {!("BarcodeDetector" in window) && (
              <p className="text-xs text-destructive text-center">
                Camera barcode detection is not supported in this browser. Please use Manual/Scanner Gun mode instead.
              </p>
            )}
          </div>
        )}

        {/* Result */}
        {result && (
          <Card className={`border-2 ${result.valid ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" : "border-destructive/50 bg-destructive/5"}`}>
            <CardContent className="pt-4 pb-4">
              {result.valid ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="font-bold text-lg">Valid Receipt</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Receipt #</span>
                      <p className="font-mono font-semibold text-foreground">{result.record.receipt_number}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Student</span>
                      <p className="font-semibold text-foreground">{result.studentName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Class</span>
                      <p className="font-semibold text-foreground">{result.className}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Payment Date</span>
                      <p className="font-semibold text-foreground">{result.record.payment_date || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount Paid</span>
                      <p className="font-bold text-green-700 dark:text-green-400">${Number(result.record.amount_paid).toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Amount Due</span>
                      <p className="font-semibold text-foreground">${Number(result.record.amount_due).toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Term</span>
                      <p className="font-semibold text-foreground">{result.record.term?.replace("_", " ").toUpperCase()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Overall Balance</span>
                      <p className={`font-bold ${(result.balance ?? 0) > 0 ? "text-destructive" : "text-green-700 dark:text-green-400"}`}>
                        {(result.balance ?? 0) > 0 ? `$${result.balance?.toFixed(2)} owing` : "Fully paid"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <XCircle className="w-8 h-8 text-destructive" />
                  <div>
                    <p className="font-bold text-destructive text-lg">Invalid Receipt</p>
                    <p className="text-sm text-muted-foreground">No matching receipt found. This may be a fraudulent or deleted receipt.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {result && (
          <Button variant="outline" onClick={reset} className="w-full">
            Scan Another Receipt
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScanner;

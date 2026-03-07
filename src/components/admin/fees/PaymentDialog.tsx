import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PAYMENT_METHODS, generateReceipt } from "./FeeConstants";
import ReceiptImageUpload from "@/components/ReceiptImageUpload";

interface Props {
  record: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zigRate: number;
  getStudentName: (id: string) => string;
  onPaid: () => void;
}

const PaymentDialog = ({ record, open, onOpenChange, zigRate, getStudentName, onPaid }: Props) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [method, setMethod] = useState("cash");
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  if (!record) return null;

  const balance = Number(record.amount_due) - Number(record.amount_paid);

  const handlePay = async () => {
    const raw = Number(amount);
    if (!raw || raw <= 0) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }

    const payUSD = currency === "ZIG" ? raw / zigRate : raw;
    if (payUSD > balance + 0.01) { toast({ title: "Amount exceeds balance", variant: "destructive" }); return; }

    const newPaid = Number(record.amount_paid) + payUSD;
    const receipt = generateReceipt();

    const { error } = await supabase.from("fee_records").update({
      amount_paid: Math.round(newPaid * 100) / 100,
      receipt_number: receipt,
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: method,
      receipt_image_url: receiptImage,
    } as any).eq("id", record.id);

    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Payment Recorded", description: `Receipt: ${receipt} — $${payUSD.toFixed(2)} paid` });
      setAmount("");
      setReceiptImage(null);
      onOpenChange(false);
      onPaid();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-muted space-y-1">
            <p className="font-medium text-foreground">{getStudentName(record.student_id)}</p>
            <p className="text-sm text-muted-foreground">{record.academic_year} — {record.term.replace("_", " ").toUpperCase()}</p>
            <div className="flex justify-between text-sm">
              <span>Total Due:</span>
              <span className="font-bold">${Number(record.amount_due).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Already Paid:</span>
              <span className="text-green-600">${Number(record.amount_paid).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>Balance:</span>
              <span className="text-destructive">${balance.toFixed(2)} / ZIG {(balance * zigRate).toFixed(0)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="USD">USD ($)</option>
              <option value="ZIG">ZIG</option>
            </select>
            <Input type="number" placeholder={`Amount (max ${currency === "ZIG" ? (balance * zigRate).toFixed(0) : balance.toFixed(2)})`} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          {amount && (
            <p className="text-xs text-muted-foreground">
              {currency === "USD" ? `= ZIG ${(Number(amount) * zigRate).toFixed(2)}` : `= $${(Number(amount) / zigRate).toFixed(2)} USD`}
            </p>
          )}

          <select className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm" value={method} onChange={(e) => setMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>

          <ReceiptImageUpload
            value={receiptImage}
            onChange={setReceiptImage}
            folder="fee-payments"
          />

          <Button className="w-full" onClick={handlePay}>Confirm Payment</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialog;

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PAYMENT_METHODS, getTermFromDate, generateReceipt, methodLabel } from "./FeeConstants";

interface Props {
  students: any[];
  studentProfiles: any[];
  feeStructure: Record<string, { tuition: number; levy: number }>;
  zigRate: number;
  years: number[];
  onAdded: () => void;
  classes?: any[];
}

const AddFeeForm = ({ students, studentProfiles, feeStructure, zigRate, years, onAdded, classes }: Props) => {
  const { toast } = useToast();
  const [selectedStudent, setSelectedStudent] = useState("");
  const [term, setTerm] = useState(getTermFromDate());
  const [feeYear, setFeeYear] = useState(new Date().getFullYear().toString());
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");

  const getStudentLevel = (id: string) => studentProfiles.find((s) => s.user_id === id)?.level || "o_level";

  const selectedLevel = selectedStudent ? getStudentLevel(selectedStudent) : "o_level";
  const fees = feeStructure[selectedLevel] || { tuition: 120, levy: 0 };
  const totalDue = fees.tuition + fees.levy;

  const handleAdd = async () => {
    if (!selectedStudent) {
      toast({ title: "Error", description: "Select a student.", variant: "destructive" });
      return;
    }
    const paidRaw = Number(amountPaid) || 0;
    const paidUSD = currency === "ZIG" ? paidRaw / zigRate : paidRaw;
    const receiptNumber = paidUSD > 0 ? generateReceipt() : null;

    const { error } = await supabase.from("fee_records").insert({
      student_id: selectedStudent,
      term: term as any,
      academic_year: parseInt(feeYear),
      amount_due: totalDue,
      amount_paid: Math.round(paidUSD * 100) / 100,
      notes: notes || null,
      receipt_number: receiptNumber,
      payment_date: paidUSD > 0 ? new Date().toISOString().split("T")[0] : null,
      payment_method: paymentMethod,
      currency,
      zig_amount: Math.round(totalDue * zigRate * 100) / 100,
    } as any);

    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Fee Record Created", description: receiptNumber ? `Receipt: ${receiptNumber}` : `$${totalDue} billed` });

      // Send receipt email if payment was made
      if (receiptNumber && paidUSD > 0) {
        const student = students.find(s => s.user_id === selectedStudent);
        const sp = studentProfiles.find(s => s.user_id === selectedStudent);
        const cls = sp?.class_id && classes ? classes.find((c: any) => c.id === sp.class_id) : null;
        const className = cls ? `${cls.name}${cls.stream ? ` (${cls.stream})` : ""}` : undefined;

        if (student?.email) {
          supabase.functions.invoke("send-branded-email", {
            body: {
              email: student.email,
              type: "fee_receipt",
              receipt_data: {
                studentName: student.full_name,
                receiptNumber,
                academicYear: parseInt(feeYear),
                term,
                amountDue: totalDue,
                amountPaid: Math.round(paidUSD * 100) / 100,
                paymentMethod: methodLabel(paymentMethod),
                paymentDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
                className,
              },
            },
          }).catch(() => {});
        }
      }

      setSelectedStudent("");
      setAmountPaid("");
      setNotes("");
      onAdded();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Add Fee Record</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm flex-1 min-w-[200px]" value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}>
            <option value="">Select Student...</option>
            {students.map((s) => (
              <option key={s.user_id} value={s.user_id}>{s.full_name}</option>
            ))}
          </select>
          <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={feeYear} onChange={(e) => setFeeYear(e.target.value)}>
            {years.length > 0 ? years.map((y) => <option key={y} value={y}>{y}</option>) : <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>}
          </select>
          <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={term} onChange={(e) => setTerm(e.target.value)}>
            <option value="term_1">Term 1</option>
            <option value="term_2">Term 2</option>
            <option value="term_3">Term 3</option>
          </select>
        </div>

        {selectedStudent && (
          <div className="p-3 rounded-lg bg-muted text-sm space-y-1">
            <p className="font-medium text-foreground">
              {selectedLevel.replace("_", " ").toUpperCase()} — Total Due: <span className="text-primary font-bold">${totalDue}</span>
              <span className="text-muted-foreground ml-2">(Tuition: ${fees.tuition} + Levy: ${fees.levy})</span>
            </p>
            <p className="text-xs text-muted-foreground">ZIG {(totalDue * zigRate).toLocaleString()}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="USD">USD ($)</option>
            <option value="ZIG">ZIG</option>
          </select>
          <Input placeholder="Amount Paying" type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="w-40" />
          <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          {amountPaid && (
            <div className="flex items-center text-xs text-muted-foreground bg-muted px-3 rounded-lg">
              {currency === "USD" ? `= ZIG ${(Number(amountPaid) * zigRate).toFixed(2)}` : `= $${(Number(amountPaid) / zigRate).toFixed(2)} USD`}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="flex-1 min-w-[200px]" />
          <Button onClick={handleAdd}><Plus className="w-4 h-4 mr-1" /> Add Record</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AddFeeForm;

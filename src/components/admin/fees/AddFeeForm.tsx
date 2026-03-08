import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PAYMENT_METHODS, getTermFromDate, generateReceipt, methodLabel } from "./FeeConstants";
import StudentSearchCombobox from "./StudentSearchCombobox";

interface Props {
  students: any[];
  studentProfiles: any[];
  feeStructure: Record<string, { tuition: number; levy: number }>;
  zigRate: number;
  years: number[];
  onAdded: () => void;
  classes?: any[];
  existingRecords?: any[];
  onPayExisting?: (record: any) => void;
}

const TERMS = [
  { value: "term_1", label: "Term 1" },
  { value: "term_2", label: "Term 2" },
  { value: "term_3", label: "Term 3" },
];

const AddFeeForm = ({ students, studentProfiles, feeStructure, zigRate, years, onAdded, classes, existingRecords = [], onPayExisting }: Props) => {
  const { toast } = useToast();
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedTerms, setSelectedTerms] = useState<string[]>([getTermFromDate()]);
  const [feeYear, setFeeYear] = useState(new Date().getFullYear().toString());
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getStudentLevel = (id: string) => studentProfiles.find((s) => s.user_id === id)?.level || "o_level";

  const selectedLevel = selectedStudent ? getStudentLevel(selectedStudent) : "o_level";
  const fees = feeStructure[selectedLevel] || { tuition: 120, levy: 0 };
  const perTermDue = fees.tuition + fees.levy;
  const totalDue = perTermDue * selectedTerms.length;

  // Check for existing records for selected student/term/year
  const existingForSelection = selectedStudent
    ? selectedTerms.map((term) => {
        const existing = existingRecords.find(
          (r) => r.student_id === selectedStudent && r.term === term && r.academic_year === parseInt(feeYear)
        );
        return existing ? { term, record: existing } : null;
      }).filter(Boolean) as { term: string; record: any }[]
    : [];

  const hasExistingConflicts = existingForSelection.length > 0;
  const termsWithoutConflicts = selectedTerms.filter(
    (t) => !existingForSelection.some((e) => e.term === t)
  );

  const toggleTerm = (term: string) => {
    setSelectedTerms((prev) =>
      prev.includes(term) ? prev.filter((t) => t !== term) : [...prev, term]
    );
  };

  const handleAdd = async () => {
    if (!selectedStudent) {
      toast({ title: "Error", description: "Select a student.", variant: "destructive" });
      return;
    }
    // Only create records for terms that don't already exist
    const termsToCreate = hasExistingConflicts ? termsWithoutConflicts : selectedTerms;
    if (termsToCreate.length === 0) {
      toast({ title: "Error", description: "All selected terms already have records. Use 'Record Payment' to add payments.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    const paidRaw = Number(amountPaid) || 0;
    const totalPaidUSD = currency === "ZIG" ? paidRaw / zigRate : paidRaw;

    // Split payment evenly across terms being created
    const perTermPaid = termsToCreate.length > 0 ? totalPaidUSD / termsToCreate.length : 0;

    const records = termsToCreate.map((term) => ({
      student_id: selectedStudent,
      term: term as any,
      academic_year: parseInt(feeYear),
      amount_due: perTermDue,
      amount_paid: Math.round(perTermPaid * 100) / 100,
      notes: notes || null,
      receipt_number: perTermPaid > 0 ? generateReceipt() : null,
      payment_date: perTermPaid > 0 ? new Date().toISOString().split("T")[0] : null,
      payment_method: paymentMethod,
      currency,
      zig_amount: Math.round(perTermDue * zigRate * 100) / 100,
    }));

    const { error } = await supabase.from("fee_records").insert(records as any);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const termLabels = selectedTerms.map((t) => t.replace("_", " ").toUpperCase()).join(", ");
      toast({
        title: `${selectedTerms.length} Fee Record${selectedTerms.length > 1 ? "s" : ""} Created`,
        description: totalPaidUSD > 0
          ? `$${totalPaidUSD.toFixed(2)} paid across ${termLabels}`
          : `$${totalDue} billed for ${termLabels}`,
      });

      // Send receipt emails for paid records
      if (totalPaidUSD > 0) {
        const student = students.find((s) => s.user_id === selectedStudent);
        const sp = studentProfiles.find((s) => s.user_id === selectedStudent);
        const cls = sp?.class_id && classes ? classes.find((c: any) => c.id === sp.class_id) : null;
        const className = cls ? `${cls.name}${cls.stream ? ` (${cls.stream})` : ""}` : undefined;

        if (student?.email) {
          for (const rec of records) {
            if (rec.receipt_number) {
              supabase.functions.invoke("send-branded-email", {
                body: {
                  email: student.email,
                  type: "fee_receipt",
                  receipt_data: {
                    studentName: student.full_name,
                    receiptNumber: rec.receipt_number,
                    academicYear: parseInt(feeYear),
                    term: rec.term,
                    amountDue: perTermDue,
                    amountPaid: Math.round(perTermPaid * 100) / 100,
                    paymentMethod: methodLabel(paymentMethod),
                    paymentDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " at " + new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
                    className,
                  },
                },
              }).catch(() => {});
            }
          }
        }
      }

      setSelectedStudent("");
      setAmountPaid("");
      setNotes("");
      setSelectedTerms([getTermFromDate()]);
      onAdded();
    }
    setIsSubmitting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Add Fee Record</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <StudentSearchCombobox
            students={students}
            value={selectedStudent}
            onChange={setSelectedStudent}
          />
          <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={feeYear} onChange={(e) => setFeeYear(e.target.value)}>
            {years.length > 0 ? years.map((y) => <option key={y} value={y}>{y}</option>) : <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>}
          </select>
        </div>

        {/* Multi-term selector */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground self-center mr-1">Terms:</span>
          {TERMS.map((t) => (
            <Button
              key={t.value}
              type="button"
              size="sm"
              variant={selectedTerms.includes(t.value) ? "default" : "outline"}
              onClick={() => toggleTerm(t.value)}
            >
              {t.label}
            </Button>
          ))}
          {selectedTerms.length > 1 && (
            <span className="text-xs text-muted-foreground self-center ml-2">
              ({selectedTerms.length} terms selected — payment split evenly)
            </span>
          )}
        </div>

        {selectedStudent && (
          <div className="p-3 rounded-lg bg-muted text-sm space-y-1">
            <p className="font-medium text-foreground">
              {selectedLevel.replace("_", " ").toUpperCase()} — Per Term: <span className="text-primary font-bold">${perTermDue}</span>
              <span className="text-muted-foreground ml-2">(Tuition: ${fees.tuition} + Levy: ${fees.levy})</span>
            </p>
            {selectedTerms.length > 1 && (
              <p className="font-bold text-foreground">
                Total ({selectedTerms.length} terms): <span className="text-primary">${totalDue}</span>
                <span className="text-muted-foreground ml-2">/ ZIG {(totalDue * zigRate).toLocaleString()}</span>
              </p>
            )}
            <p className="text-xs text-muted-foreground">ZIG {(perTermDue * zigRate).toLocaleString()} per term</p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="USD">USD ($)</option>
            <option value="ZIG">ZIG</option>
          </select>
          <Input placeholder={`Amount Paying${selectedTerms.length > 1 ? " (total)" : ""}`} type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="w-40" />
          <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          {amountPaid && (
            <div className="flex items-center text-xs text-muted-foreground bg-muted px-3 rounded-lg">
              {currency === "USD" ? `= ZIG ${(Number(amountPaid) * zigRate).toFixed(2)}` : `= $${(Number(amountPaid) / zigRate).toFixed(2)} USD`}
              {selectedTerms.length > 1 && ` (${currency === "USD" ? `$${(Number(amountPaid) / selectedTerms.length).toFixed(2)}` : `ZIG ${(Number(amountPaid) / selectedTerms.length).toFixed(0)}`}/term)`}
            </div>
          )}
        </div>

        {/* Warning for existing records */}
        {hasExistingConflicts && selectedStudent && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm space-y-2">
            <p className="font-medium text-destructive">⚠️ Records already exist for this student:</p>
            {existingForSelection.map(({ term, record }) => {
              const balance = Number(record.amount_due) - Number(record.amount_paid);
              return (
                <div key={term} className="flex items-center justify-between">
                  <span className="text-foreground">
                    {term.replace("_", " ").toUpperCase()} {feeYear} — Balance: <span className="font-bold text-destructive">${balance.toFixed(2)}</span>
                  </span>
                  {onPayExisting && balance > 0 && (
                    <Button size="sm" variant="outline" onClick={() => onPayExisting(record)}>
                      Record Payment
                    </Button>
                  )}
                </div>
              );
            })}
            {termsWithoutConflicts.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Only {termsWithoutConflicts.map(t => t.replace("_", " ").toUpperCase()).join(", ")} will be created as new records.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="flex-1 min-w-[200px]" />
          <Button onClick={handleAdd} disabled={isSubmitting || (hasExistingConflicts && termsWithoutConflicts.length === 0)}>
            <Plus className="w-4 h-4 mr-1" />
            {isSubmitting ? "Adding..." : hasExistingConflicts && termsWithoutConflicts.length === 0 ? "Records Already Exist" : `Add ${termsWithoutConflicts.length > 0 && hasExistingConflicts ? `${termsWithoutConflicts.length} New Record${termsWithoutConflicts.length > 1 ? "s" : ""}` : selectedTerms.length > 1 ? `${selectedTerms.length} Records` : "Record"}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AddFeeForm;

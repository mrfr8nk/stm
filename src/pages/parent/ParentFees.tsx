import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { DollarSign } from "lucide-react";

const ParentFees = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<string[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: links } = await supabase.from("parent_student_links").select("student_id").eq("parent_id", user.id);
      const ids = (links || []).map(l => l.student_id);
      setChildren(ids);

      if (ids.length > 0) {
        const [f, p] = await Promise.all([
          supabase.from("fee_records").select("*").in("student_id", ids).is("deleted_at", null).order("created_at", { ascending: false }),
          supabase.from("profiles").select("*").in("user_id", ids),
        ]);
        setFees(f.data || []);
        setProfiles(p.data || []);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  const getName = (uid: string) => profiles.find(p => p.user_id === uid)?.full_name || "Student";

  return (
    <DashboardLayout role="parent">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Children's Fees</h1>

        {loading ? (
          <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : children.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No children linked.</CardContent></Card>
        ) : (
          children.map(childId => {
            const childFees = fees.filter(f => f.student_id === childId);
            const totalDue = childFees.reduce((s, f) => s + Number(f.amount_due), 0);
            const totalPaid = childFees.reduce((s, f) => s + Number(f.amount_paid), 0);
            const balance = totalDue - totalPaid;

            return (
              <Card key={childId}>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5" /> {getName(childId)}</CardTitle>
                    <div className="flex gap-4 text-sm">
                      <span>Due: <strong>${totalDue.toFixed(2)}</strong></span>
                      <span className="text-green-600">Paid: <strong>${totalPaid.toFixed(2)}</strong></span>
                      <span className={balance > 0 ? "text-destructive" : "text-green-600"}>Balance: <strong>${balance.toFixed(2)}</strong></span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year</TableHead><TableHead>Term</TableHead><TableHead>Due</TableHead>
                        <TableHead>Paid</TableHead><TableHead>Balance</TableHead><TableHead>Method</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {childFees.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No fee records.</TableCell></TableRow>
                      ) : childFees.map(f => (
                        <TableRow key={f.id}>
                          <TableCell>{f.academic_year}</TableCell>
                          <TableCell>{f.term.replace("_", " ").toUpperCase()}</TableCell>
                          <TableCell>${Number(f.amount_due).toFixed(2)}</TableCell>
                          <TableCell className="text-green-600">${Number(f.amount_paid).toFixed(2)}</TableCell>
                          <TableCell className={Number(f.amount_due) - Number(f.amount_paid) > 0 ? "text-destructive font-bold" : "text-green-600"}>
                            ${(Number(f.amount_due) - Number(f.amount_paid)).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-sm">{f.payment_method || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </DashboardLayout>
  );
};

export default ParentFees;

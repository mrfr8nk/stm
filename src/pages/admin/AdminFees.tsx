import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

const AdminFees = () => (
  <DashboardLayout role="admin">
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Fee Management</h1>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5" /> Student Fees</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Fee management tools for setting term fees, recording payments, and generating receipts will be available here.</p>
        </CardContent>
      </Card>
    </div>
  </DashboardLayout>
);

export default AdminFees;

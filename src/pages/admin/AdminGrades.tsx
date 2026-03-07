import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

const AdminGrades = () => (
  <DashboardLayout role="admin">
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Grades Overview</h1>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> School Performance</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Grade analytics and performance reports will be available once teachers begin entering grades into the system.</p>
        </CardContent>
      </Card>
    </div>
  </DashboardLayout>
);

export default AdminGrades;

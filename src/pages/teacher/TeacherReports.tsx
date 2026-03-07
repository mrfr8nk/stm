import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

const TeacherReports = () => {
  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Report Cards</h1>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" /> Generate Report Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Report card generation will be available once grades have been entered for all subjects.
              Go to <a href="/teacher/grades" className="text-primary hover:underline">Set Grades</a> first, then return here to generate PDF reports.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TeacherReports;

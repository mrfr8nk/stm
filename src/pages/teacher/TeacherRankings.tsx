import DashboardLayout from "@/components/DashboardLayout";
import RankingsPage from "@/pages/shared/RankingsPage";

const TeacherRankings = () => (
  <DashboardLayout role="teacher">
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Class Rankings & Trends</h1>
      <p className="text-sm text-muted-foreground">View student rankings and performance trends</p>
      <RankingsPage />
    </div>
  </DashboardLayout>
);

export default TeacherRankings;

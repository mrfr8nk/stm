import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import RankingsPage from "@/pages/shared/RankingsPage";

const StudentRankings = () => {
  const { user } = useAuth();
  return (
    <DashboardLayout role="student">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">My Rankings</h1>
        <p className="text-sm text-muted-foreground">See where you stand among your classmates</p>
        <RankingsPage studentHighlight={user?.id} />
      </div>
    </DashboardLayout>
  );
};

export default StudentRankings;

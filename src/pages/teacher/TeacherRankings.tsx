import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import RankingsPage from "@/pages/shared/RankingsPage";

const TeacherRankings = () => {
  const { user } = useAuth();
  const [defaultClassId, setDefaultClassId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    // Check if teacher is a class teacher first, auto-select that class
    supabase.from("classes").select("id").eq("class_teacher_id", user.id).is("deleted_at", null).limit(1).maybeSingle()
      .then(({ data }) => {
        if (data) setDefaultClassId(data.id);
      });
  }, [user]);

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Class Rankings & Trends</h1>
        <p className="text-sm text-muted-foreground">View student rankings and performance trends</p>
        <RankingsPage defaultClass={defaultClassId || undefined} />
      </div>
    </DashboardLayout>
  );
};

export default TeacherRankings;

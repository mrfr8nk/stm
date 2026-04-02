import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, LogIn, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityEntry {
  id: string;
  action: string;
  details: string | null;
  entity_type: string | null;
  created_at: string;
}

const AccountActivity = ({ showAll = false }: { showAll?: boolean }) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      let query = supabase.from("activity_log").select("*")
        .order("created_at", { ascending: false })
        .limit(showAll ? 50 : 15);
      
      if (!showAll) {
        query = query.eq("user_id", user.id);
      }

      const { data } = await query;
      setActivities(data || []);
      setLoading(false);
    };
    fetch();
  }, [user, showAll]);

  const getIcon = (action: string) => {
    if (action.toLowerCase().includes("login") || action.toLowerCase().includes("logged in")) return LogIn;
    return Activity;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Clock className="w-5 h-5" /> Account Activity</CardTitle></CardHeader>
        <CardContent><div className="flex justify-center py-6"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="w-5 h-5" /> {showAll ? "System Activity Log" : "My Account Activity"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">No activity recorded yet.</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {activities.map(a => {
              const Icon = getIcon(a.action);
              return (
                <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border-l-4 border-l-primary">
                  <Icon className="w-4 h-4 mt-1 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{a.action}</p>
                    {a.details && <p className="text-xs text-muted-foreground truncate">{a.details}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </p>
                      {a.entity_type && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{a.entity_type}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountActivity;

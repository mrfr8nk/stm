import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ShieldCheck, AlertCircle, AlertTriangle, ArrowRight, RefreshCw, Sparkles } from "lucide-react";

const SecurityWidget = () => {
  const [summary, setSummary] = useState<{ critical: number; high: number; medium: number; total: number } | null>(null);
  const [aiInsight, setAiInsight] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const resp = await supabase.functions.invoke("security-scan");
      if (resp.data) {
        setSummary({
          critical: resp.data.summary?.critical || 0,
          high: resp.data.summary?.high || 0,
          medium: resp.data.summary?.medium || 0,
          total: (resp.data.summary?.critical || 0) + (resp.data.summary?.high || 0) + (resp.data.summary?.medium || 0),
        });
        setAiInsight(resp.data.ai_insights || "");
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchAlerts(); }, []);

  const hasThreats = summary && summary.total > 0;

  return (
    <Card className={`border-2 ${hasThreats ? "border-red-200 dark:border-red-900" : "border-green-200 dark:border-green-900"}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            {hasThreats ? <ShieldAlert className="w-5 h-5 text-red-500" /> : <ShieldCheck className="w-5 h-5 text-green-500" />}
            AI Security Monitor
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchAlerts} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <RefreshCw className="w-4 h-4 animate-spin" /> Running security scan...
          </div>
        ) : summary ? (
          <>
            {hasThreats ? (
              <div className="flex gap-3">
                {summary.critical > 0 && (
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-bold text-red-600">{summary.critical} Critical</span>
                  </div>
                )}
                {summary.high > 0 && (
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-bold text-orange-600">{summary.high} High</span>
                  </div>
                )}
                {summary.medium > 0 && (
                  <Badge variant="secondary">{summary.medium} Medium</Badge>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <ShieldCheck className="w-5 h-5" />
                <span className="text-sm font-medium">All clear — no active threats</span>
              </div>
            )}

            {aiInsight && (
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 border border-border">
                <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground line-clamp-2">{aiInsight}</p>
              </div>
            )}

            <Link to="/admin/security">
              <Button variant="outline" size="sm" className="w-full gap-2">
                View Security Dashboard <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default SecurityWidget;

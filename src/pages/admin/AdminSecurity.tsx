import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldAlert, ShieldCheck, RefreshCw, AlertTriangle, AlertCircle, Info,
  CheckCircle2, Clock, User, Sparkles, Activity, Eye, Lock, Zap,
  TrendingUp, BarChart3
} from "lucide-react";

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  user_id: string | null;
  metadata: any;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
}

interface ScanSummary {
  total_alerts: number;
  critical: number;
  high: number;
  medium: number;
  resolved: number;
  new_alerts: number;
}

const severityConfig: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  critical: { icon: AlertCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-900" },
  high: { icon: AlertTriangle, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-900" },
  medium: { icon: Info, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-950/30", border: "border-yellow-200 dark:border-yellow-900" },
  low: { icon: Info, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-900" },
};

const alertTypeLabels: Record<string, string> = {
  rapid_activity: "Rapid Activity",
  bulk_grade_change: "Grade Tampering",
  mass_deletion: "Mass Deletion",
  suspicious_fees: "Suspicious Fees",
  after_hours: "After-Hours Access",
  banned_user_activity: "Banned User",
  unauthorized_access: "Unauthorized Access",
};

const AdminSecurity = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [summary, setSummary] = useState<ScanSummary | null>(null);
  const [aiInsights, setAiInsights] = useState("");
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState<"all" | "unresolved" | "resolved">("unresolved");
  const [resolveDialog, setResolveDialog] = useState<SecurityAlert | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolving, setResolving] = useState(false);
  const [lastScan, setLastScan] = useState<Date | null>(null);

  const runScan = async () => {
    setScanning(true);
    try {
      const resp = await supabase.functions.invoke("security-scan");
      if (resp.error) throw resp.error;
      setAlerts(resp.data.alerts || []);
      setSummary(resp.data.summary);
      setAiInsights(resp.data.ai_insights || "");
      setLastScan(new Date());
      if (resp.data.summary?.new_alerts > 0) {
        toast({ title: "⚠️ Security Scan Complete", description: `${resp.data.summary.new_alerts} new alert(s) detected.`, variant: "destructive" });
      } else {
        toast({ title: "✅ Security Scan Complete", description: "No new threats detected." });
      }
    } catch (e: any) {
      toast({ title: "Scan Failed", description: e.message, variant: "destructive" });
    }
    setScanning(false);
  };

  useEffect(() => { runScan(); }, []);

  const resolveAlert = async () => {
    if (!resolveDialog || !user) return;
    setResolving(true);
    const { error } = await supabase
      .from("security_alerts")
      .update({
        is_resolved: true,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        resolution_notes: resolveNotes || "Reviewed and resolved by admin",
      })
      .eq("id", resolveDialog.id);

    if (!error) {
      setAlerts(prev => prev.map(a => a.id === resolveDialog.id ? { ...a, is_resolved: true, resolution_notes: resolveNotes } : a));
      toast({ title: "Alert Resolved", description: "The security alert has been marked as resolved." });
    }
    setResolving(false);
    setResolveDialog(null);
    setResolveNotes("");
  };

  const filtered = alerts.filter(a => {
    if (filter === "unresolved") return !a.is_resolved;
    if (filter === "resolved") return a.is_resolved;
    return true;
  });

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-primary" /> AI Security Monitor
            </h1>
            <p className="text-muted-foreground">AI-powered threat detection & system monitoring</p>
          </div>
          <div className="flex items-center gap-3">
            {lastScan && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" /> Last scan: {timeAgo(lastScan.toISOString())}
              </span>
            )}
            <Button onClick={runScan} disabled={scanning} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
              {scanning ? "Scanning..." : "Run AI Scan"}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="border-red-200 dark:border-red-900">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{summary.critical}</p>
                  <p className="text-xs text-muted-foreground">Critical</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-orange-200 dark:border-orange-900">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-600">{summary.high}</p>
                  <p className="text-xs text-muted-foreground">High</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 dark:border-yellow-900">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/30">
                  <Info className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{summary.medium}</p>
                  <p className="text-xs text-muted-foreground">Medium</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/30">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{summary.resolved}</p>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{summary.total_alerts}</p>
                  <p className="text-xs text-muted-foreground">Total Alerts</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* AI Insights */}
        {aiInsights && (
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground mb-1">AI Security Assessment</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{aiInsights}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(["unresolved", "all", "resolved"] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f === "unresolved" ? <Eye className="w-3.5 h-3.5 mr-1.5" /> : f === "resolved" ? <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> : <BarChart3 className="w-3.5 h-3.5 mr-1.5" />}
              {f} ({
                f === "unresolved" ? alerts.filter(a => !a.is_resolved).length
                : f === "resolved" ? alerts.filter(a => a.is_resolved).length
                : alerts.length
              })
            </Button>
          ))}
        </div>

        {/* Alerts List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <ShieldCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                  {filter === "unresolved" ? "All Clear!" : "No alerts found"}
                </h3>
                <p className="text-muted-foreground">
                  {filter === "unresolved" ? "No active security threats detected. The system is secure." : "No alerts match this filter."}
                </p>
              </CardContent>
            </Card>
          ) : (
            filtered.map(alert => {
              const config = severityConfig[alert.severity] || severityConfig.medium;
              const SevIcon = config.icon;
              return (
                <Card key={alert.id} className={`border ${config.border} ${alert.is_resolved ? "opacity-60" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg shrink-0 ${config.bg}`}>
                        <SevIcon className={`w-5 h-5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-medium text-foreground">{alert.title}</h4>
                          <Badge variant="outline" className={`text-[10px] ${config.color}`}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {alertTypeLabels[alert.alert_type] || alert.alert_type}
                          </Badge>
                          {alert.is_resolved && (
                            <Badge className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Resolved
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(alert.created_at)}</span>
                          {alert.user_id && (
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> User flagged</span>
                          )}
                        </div>
                        {alert.resolution_notes && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> {alert.resolution_notes}
                          </p>
                        )}
                      </div>
                      {!alert.is_resolved && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setResolveDialog(alert)}
                          className="shrink-0"
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Resolve Dialog */}
        <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolve Security Alert</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="font-medium text-sm">{resolveDialog?.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{resolveDialog?.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Resolution Notes</label>
                <Textarea
                  value={resolveNotes}
                  onChange={e => setResolveNotes(e.target.value)}
                  placeholder="Describe the investigation findings and actions taken..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolveDialog(null)}>Cancel</Button>
              <Button onClick={resolveAlert} disabled={resolving}>
                {resolving ? "Resolving..." : "Mark as Resolved"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminSecurity;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    // Gather data for AI analysis
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch recent activity logs
    const { data: recentActivity } = await supabase
      .from("activity_log")
      .select("*")
      .gte("created_at", oneDayAgo)
      .order("created_at", { ascending: false })
      .limit(500);

    // Fetch recent grade changes
    const { data: recentGrades } = await supabase
      .from("grades")
      .select("id, student_id, teacher_id, mark, updated_at, created_at, deleted_at")
      .gte("updated_at", oneDayAgo)
      .order("updated_at", { ascending: false })
      .limit(200);

    // Fetch recent fee modifications
    const { data: recentFees } = await supabase
      .from("fee_records")
      .select("id, student_id, amount_paid, amount_due, created_at, deleted_at, payment_method")
      .gte("created_at", oneWeekAgo)
      .order("created_at", { ascending: false })
      .limit(200);

    // Fetch user roles for context
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    // Fetch profiles for name resolution
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, is_banned");

    // Fetch existing unresolved alerts to avoid duplicates
    const { data: existingAlerts } = await supabase
      .from("security_alerts")
      .select("title, created_at")
      .eq("is_resolved", false)
      .gte("created_at", oneDayAgo);

    // Build analysis context
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    const roleMap = new Map(userRoles?.map(r => [r.user_id, r.role]) || []);

    // Rule-based detection first
    const alerts: any[] = [];

    // 1. Detect rapid-fire activity from single user (>20 actions in 1 hour)
    const hourlyActivity: Record<string, number> = {};
    recentActivity?.filter(a => new Date(a.created_at) >= new Date(oneHourAgo)).forEach(a => {
      hourlyActivity[a.user_id] = (hourlyActivity[a.user_id] || 0) + 1;
    });
    for (const [userId, count] of Object.entries(hourlyActivity)) {
      if (count > 20) {
        const p = profileMap.get(userId);
        alerts.push({
          alert_type: "rapid_activity",
          severity: count > 50 ? "critical" : "high",
          title: `Unusually high activity: ${p?.full_name || "Unknown User"}`,
          description: `${count} actions performed in the last hour by ${p?.full_name || userId} (${p?.email || "unknown email"}). This could indicate automated/bot activity or account compromise.`,
          user_id: userId,
          metadata: { action_count: count, period: "1_hour" },
        });
      }
    }

    // 2. Detect bulk grade modifications by a single teacher
    const teacherGradeEdits: Record<string, number> = {};
    recentGrades?.forEach(g => {
      if (g.updated_at !== g.created_at) {
        teacherGradeEdits[g.teacher_id] = (teacherGradeEdits[g.teacher_id] || 0) + 1;
      }
    });
    for (const [teacherId, count] of Object.entries(teacherGradeEdits)) {
      if (count > 15) {
        const p = profileMap.get(teacherId);
        alerts.push({
          alert_type: "bulk_grade_change",
          severity: count > 30 ? "critical" : "high",
          title: `Bulk grade modifications: ${p?.full_name || "Unknown Teacher"}`,
          description: `${count} grade records were modified in the last 24 hours by ${p?.full_name || teacherId}. Possible grade tampering detected.`,
          user_id: teacherId,
          metadata: { grade_edits: count, period: "24_hours" },
        });
      }
    }

    // 3. Detect deleted records (soft deletes)
    const deletedGrades = recentGrades?.filter(g => g.deleted_at) || [];
    if (deletedGrades.length > 5) {
      alerts.push({
        alert_type: "mass_deletion",
        severity: deletedGrades.length > 20 ? "critical" : "high",
        title: `Mass grade deletion detected`,
        description: `${deletedGrades.length} grade records were deleted in the last 24 hours. This may indicate data tampering or unauthorized cleanup.`,
        metadata: { deleted_count: deletedGrades.length, type: "grades" },
      });
    }

    // 4. Detect suspicious fee patterns (large amounts, unusual methods)
    const suspiciousFees = recentFees?.filter(f => f.amount_paid > 5000 || f.deleted_at) || [];
    if (suspiciousFees.length > 0) {
      alerts.push({
        alert_type: "suspicious_fees",
        severity: suspiciousFees.some(f => f.deleted_at) ? "high" : "medium",
        title: `Suspicious fee activity detected`,
        description: `${suspiciousFees.length} fee records flagged: ${suspiciousFees.filter(f => f.deleted_at).length} deleted, ${suspiciousFees.filter(f => f.amount_paid > 5000).length} with unusually high amounts.`,
        metadata: { flagged_count: suspiciousFees.length },
      });
    }

    // 5. Detect after-hours activity (between 10pm and 5am)
    const afterHoursActivity = recentActivity?.filter(a => {
      const hour = new Date(a.created_at).getHours();
      return hour >= 22 || hour < 5;
    }) || [];
    if (afterHoursActivity.length > 3) {
      const uniqueUsers = [...new Set(afterHoursActivity.map(a => a.user_id))];
      alerts.push({
        alert_type: "after_hours",
        severity: "medium",
        title: `After-hours system access detected`,
        description: `${afterHoursActivity.length} actions by ${uniqueUsers.length} user(s) between 10PM-5AM. Users: ${uniqueUsers.map(u => profileMap.get(u)?.full_name || "Unknown").join(", ")}.`,
        metadata: { action_count: afterHoursActivity.length, users: uniqueUsers },
      });
    }

    // 6. Banned user activity check
    const bannedUsers = profiles?.filter(p => p.is_banned) || [];
    const bannedActivity = recentActivity?.filter(a => bannedUsers.some(b => b.user_id === a.user_id)) || [];
    if (bannedActivity.length > 0) {
      alerts.push({
        alert_type: "banned_user_activity",
        severity: "critical",
        title: `Banned user attempting system access`,
        description: `${bannedActivity.length} actions detected from banned accounts. Immediate investigation required.`,
        metadata: { actions: bannedActivity.length },
      });
    }

    // Use AI for deeper analysis if available
    let aiInsights = "";
    if (lovableKey && recentActivity && recentActivity.length > 0) {
      try {
        const analysisPrompt = `You are a school security AI analyst. Analyze this activity data for suspicious patterns.

ACTIVITY SUMMARY (last 24h):
- Total actions: ${recentActivity?.length || 0}
- Unique users: ${new Set(recentActivity?.map(a => a.user_id)).size}
- Grade changes: ${recentGrades?.length || 0}
- Fee records: ${recentFees?.length || 0}
- After-hours actions: ${afterHoursActivity.length}
- Deleted grades: ${deletedGrades.length}

ACTION TYPES: ${JSON.stringify([...new Set(recentActivity?.map(a => a.action))])}

RULE-BASED ALERTS FOUND: ${alerts.length}

Provide a brief security assessment (2-3 sentences max). Focus on patterns, risks, and recommendations. Be specific but concise.`;

        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "You are a concise security analyst for a school management system. Give brief, actionable insights." },
              { role: "user", content: analysisPrompt },
            ],
          }),
        });

        if (aiResp.ok) {
          const aiData = await aiResp.json();
          aiInsights = aiData.choices?.[0]?.message?.content || "";
        }
      } catch (e) {
        console.error("AI analysis failed:", e);
      }
    }

    // Filter out duplicate alerts (same title exists unresolved today)
    const existingTitles = new Set(existingAlerts?.map(a => a.title) || []);
    const newAlerts = alerts.filter(a => !existingTitles.has(a.title));

    // Insert new alerts
    if (newAlerts.length > 0) {
      await supabase.from("security_alerts").insert(newAlerts);
    }

    // Fetch all current alerts for response
    const { data: allAlerts } = await supabase
      .from("security_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    return new Response(JSON.stringify({
      alerts: allAlerts || [],
      summary: {
        total_alerts: allAlerts?.length || 0,
        critical: allAlerts?.filter(a => a.severity === "critical" && !a.is_resolved).length || 0,
        high: allAlerts?.filter(a => a.severity === "high" && !a.is_resolved).length || 0,
        medium: allAlerts?.filter(a => a.severity === "medium" && !a.is_resolved).length || 0,
        resolved: allAlerts?.filter(a => a.is_resolved).length || 0,
        new_alerts: newAlerts.length,
      },
      ai_insights: aiInsights,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("Security scan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

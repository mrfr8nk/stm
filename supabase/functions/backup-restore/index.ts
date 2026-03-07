import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BACKUP_TABLES = [
  "profiles", "user_roles", "student_profiles", "teacher_profiles",
  "classes", "subjects", "teacher_assignments", "grades", "monthly_tests",
  "attendance", "fee_records", "announcements", "access_codes",
  "academic_sessions", "grading_scales", "system_settings", "activity_log",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Verify admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").single();
  if (!roleData) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: corsHeaders });

  try {
    const { action, backup_data } = await req.json();

    if (action === "backup") {
      const backup: Record<string, any[]> = {};
      for (const table of BACKUP_TABLES) {
        const { data, error } = await supabase.from(table).select("*");
        if (error) { console.error(`Error backing up ${table}:`, error); backup[table] = []; }
        else backup[table] = data || [];
      }

      return new Response(JSON.stringify({
        version: "1.0",
        created_at: new Date().toISOString(),
        created_by: user.email,
        tables: backup,
        row_counts: Object.fromEntries(Object.entries(backup).map(([k, v]) => [k, v.length])),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "restore") {
      if (!backup_data?.tables) return new Response(JSON.stringify({ error: "Invalid backup format" }), { status: 400, headers: corsHeaders });

      const results: Record<string, { success: boolean; count: number; error?: string }> = {};

      // Restore in order (respecting dependencies)
      const restoreOrder = [
        "system_settings", "academic_sessions", "grading_scales",
        "subjects", "classes", "access_codes", "announcements",
        "student_profiles", "teacher_profiles", "teacher_assignments",
        "grades", "monthly_tests", "attendance", "fee_records", "activity_log",
      ];

      for (const table of restoreOrder) {
        const rows = backup_data.tables[table];
        if (!rows || rows.length === 0) { results[table] = { success: true, count: 0 }; continue; }

        // Delete existing data first
        await supabase.from(table).delete().neq("id" in rows[0] ? "id" : "key", "___none___");

        // Insert in batches
        const batchSize = 100;
        let inserted = 0;
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          const { error } = await supabase.from(table).insert(batch);
          if (error) { results[table] = { success: false, count: inserted, error: error.message }; continue; }
          inserted += batch.length;
        }
        results[table] = { success: true, count: inserted };
      }

      await supabase.from("activity_log").insert({
        user_id: user.id, action: "Restored database backup",
        entity_type: "system", details: `Backup from ${backup_data.created_at || "unknown"}`,
      });

      return new Response(JSON.stringify({ success: true, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    console.error("backup-restore error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: corsHeaders });
  }
});

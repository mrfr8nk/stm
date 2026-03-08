import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user: caller } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_ids } = await req.json();
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(JSON.stringify({ error: "user_ids array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Don't allow deleting yourself
    const safeIds = user_ids.filter((id: string) => id !== caller.id);
    
    const results = { deleted: 0, errors: [] as string[] };

    for (const userId of safeIds) {
      try {
        // Delete related data first
        await Promise.all([
          supabase.from("user_roles").delete().eq("user_id", userId),
          supabase.from("student_profiles").delete().eq("user_id", userId),
          supabase.from("teacher_profiles").delete().eq("user_id", userId),
          supabase.from("parent_student_links").delete().eq("parent_id", userId),
          supabase.from("parent_student_links").delete().eq("student_id", userId),
          supabase.from("passkey_credentials").delete().eq("user_id", userId),
          supabase.from("profiles").delete().eq("user_id", userId),
          supabase.from("user_presence").delete().eq("user_id", userId),
          supabase.from("notifications").delete().eq("user_id", userId),
          supabase.from("activity_log").delete().eq("user_id", userId),
        ]);

        // Delete from auth
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) {
          results.errors.push(`${userId}: ${error.message}`);
        } else {
          results.deleted++;
        }
      } catch (e: any) {
        results.errors.push(`${userId}: ${e.message}`);
      }
    }

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

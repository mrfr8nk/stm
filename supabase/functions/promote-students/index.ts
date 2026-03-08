import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Define the max form per level
const MAX_FORM: Record<string, number> = {
  zjc: 2,      // Form 1-2
  o_level: 4,  // Form 3-4
  a_level: 6,  // Form 5-6
};

const NEXT_LEVEL: Record<string, { level: string; form: number } | null> = {
  zjc: { level: "o_level", form: 3 },
  o_level: { level: "a_level", form: 5 },
  a_level: null, // graduates
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller is admin
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();
    
    if (!role) throw new Error("Admin access required");

    const { academic_year } = await req.json();
    if (!academic_year) throw new Error("academic_year is required");

    // Get all active students
    const { data: students, error: fetchErr } = await supabaseAdmin
      .from("student_profiles")
      .select("id, user_id, form, level, is_active, class_id")
      .eq("is_active", true);

    if (fetchErr) throw fetchErr;
    if (!students || students.length === 0) {
      return new Response(
        JSON.stringify({ success: true, promoted: 0, graduated: 0, message: "No active students found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let promoted = 0;
    let graduated = 0;

    for (const student of students) {
      const maxForm = MAX_FORM[student.level] || 6;

      if (student.form >= maxForm) {
        // Check if there's a next level
        const next = NEXT_LEVEL[student.level];
        if (next) {
          // Promote to next level
          await supabaseAdmin
            .from("student_profiles")
            .update({
              level: next.level,
              form: next.form,
              class_id: null, // Reset class - admin assigns new class
              graduation_status: "promoted",
              updated_at: new Date().toISOString(),
            })
            .eq("id", student.id);
          promoted++;
        } else {
          // Graduate (final level, final form)
          await supabaseAdmin
            .from("student_profiles")
            .update({
              is_active: false,
              graduation_status: "graduated",
              updated_at: new Date().toISOString(),
            })
            .eq("id", student.id);
          graduated++;
        }
      } else {
        // Simple form promotion within same level
        await supabaseAdmin
          .from("student_profiles")
          .update({
            form: student.form + 1,
            class_id: null, // Reset class
            graduation_status: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", student.id);
        promoted++;
      }
    }

    // Log the activity
    await supabaseAdmin.from("activity_log").insert({
      user_id: user.id,
      action: `Promoted ${promoted} students, graduated ${graduated} students for ${academic_year}`,
      entity_type: "promotion",
      details: `Academic year: ${academic_year}. Promoted: ${promoted}, Graduated: ${graduated}`,
    });

    return new Response(
      JSON.stringify({ success: true, promoted, graduated, total: students.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in promote-students:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

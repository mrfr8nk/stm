import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const today = new Date().toISOString().split("T")[0];

    // 1. Auto-switch current term based on dates
    const { data: sessions } = await supabase
      .from("academic_sessions")
      .select("*")
      .order("academic_year", { ascending: true })
      .order("term", { ascending: true });

    if (sessions && sessions.length > 0) {
      // Find session whose date range includes today
      const matchingSession = sessions.find(
        (s: any) => today >= s.start_date && today <= s.end_date
      );

      if (matchingSession && !matchingSession.is_current) {
        // Unset all current
        await supabase
          .from("academic_sessions")
          .update({ is_current: false })
          .eq("is_current", true);

        // Set the matching one as current
        await supabase
          .from("academic_sessions")
          .update({ is_current: true })
          .eq("id", matchingSession.id);

        console.log(`Switched current session to ${matchingSession.academic_year} ${matchingSession.term}`);
      }
    }

    // 2. Auto-create next year's sessions if needed
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    const { data: nextYearSessions } = await supabase
      .from("academic_sessions")
      .select("id")
      .eq("academic_year", nextYear);

    if (!nextYearSessions || nextYearSessions.length === 0) {
      // Check if we're in the last term of current year (after Nov 1)
      const month = new Date().getMonth() + 1;
      if (month >= 11) {
        // Get current year's sessions to base dates on
        const { data: currentYearSessions } = await supabase
          .from("academic_sessions")
          .select("*")
          .eq("academic_year", currentYear)
          .order("term");

        if (currentYearSessions && currentYearSessions.length > 0) {
          const newSessions = currentYearSessions.map((s: any) => ({
            academic_year: nextYear,
            term: s.term,
            start_date: s.start_date.replace(String(currentYear), String(nextYear)),
            end_date: s.end_date.replace(String(currentYear), String(nextYear)),
            is_current: false,
          }));

          await supabase.from("academic_sessions").insert(newSessions);
          console.log(`Auto-created ${nextYear} sessions`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, checked_at: today }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in auto-session:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

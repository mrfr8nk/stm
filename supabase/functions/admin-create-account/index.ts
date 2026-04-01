import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const { data: { user: caller } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!caller) throw new Error("Not authenticated");

    const { data: callerRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .single();
    if (!callerRole) throw new Error("Not authorized - admin only");

    const { email, role, class_id, full_name } = await req.json();

    if (!email || !role) throw new Error("Email and role are required");
    if (!["student", "teacher"].includes(role)) throw new Error("Role must be student or teacher");

    const tempPassword = "Welcome" + Date.now().toString(36).slice(-6) + "!";

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: full_name || email.split("@")[0] },
    });

    if (createError) throw new Error(createError.message);
    if (!newUser.user) throw new Error("Failed to create user");

    const userId = newUser.user.id;

    await supabase.from("user_roles").insert({ user_id: userId, role });

    await supabase.from("profiles").upsert({
      user_id: userId,
      full_name: full_name || email.split("@")[0],
      email,
    });

    if (role === "student") {
      let form = 1;
      let level = "o_level";
      if (class_id) {
        const { data: cls } = await supabase.from("classes").select("form, level").eq("id", class_id).single();
        if (cls) { form = cls.form; level = cls.level; }
      }
      await supabase.from("student_profiles").insert({ user_id: userId, class_id: class_id || null, form, level });
    } else if (role === "teacher") {
      await supabase.from("teacher_profiles").insert({ user_id: userId });
    }

    const siteUrl = req.headers.get("origin") || "https://stmh.lovable.app";

    const { data: resetData } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: siteUrl + "/reset-password" },
    });

    const activationLink = resetData?.properties?.action_link || siteUrl + "/login";

    // Send welcome/activation email via send-branded-email
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const emailFnUrl = supabaseUrl + "/functions/v1/send-branded-email";
      const emailRes = await fetch(emailFnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + serviceKey,
        },
        body: JSON.stringify({
          type: "welcome",
          email,
          welcome_data: {
            name: full_name || email.split("@")[0],
            role,
            activationLink,
          },
        }),
      });
      const emailResult = await emailRes.text();
      console.log("Welcome email result:", emailRes.status, emailResult);
    } catch (emailErr) {
      console.error("Welcome email failed (non-blocking):", emailErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email,
        role,
        activation_link: activationLink,
        message: role + " account created. Activation email sent.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

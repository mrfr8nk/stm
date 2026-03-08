import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { action, credential_id, device_name } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (action === "register") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(
        authHeader.replace("Bearer ", ""),
      );
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabaseAdmin.from("passkey_credentials").insert({
        user_id: user.id,
        credential_id,
        device_name: device_name || "My Device",
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "authenticate") {
      if (!credential_id) {
        return new Response(JSON.stringify({ error: "Missing credential_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: cred, error: credError } = await supabaseAdmin
        .from("passkey_credentials")
        .select("user_id")
        .eq("credential_id", credential_id)
        .single();

      if (credError || !cred) {
        return new Response(JSON.stringify({ error: "Passkey not found. Please sign in with your password." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user is banned
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email, is_banned")
        .eq("user_id", cred.user_id)
        .single();

      if (!profile?.email) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (profile.is_banned) {
        return new Response(JSON.stringify({ error: "Your account has been banned." }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate magic link for sign-in
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: profile.email,
      });

      if (linkError) {
        return new Response(JSON.stringify({ error: linkError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update last_used_at
      await supabaseAdmin
        .from("passkey_credentials")
        .update({ last_used_at: new Date().toISOString() })
        .eq("credential_id", credential_id);

      // Get user role
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", cred.user_id)
        .single();

      return new Response(
        JSON.stringify({
          token_hash: linkData.properties?.hashed_token,
          email: profile.email,
          role: roleData?.role,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

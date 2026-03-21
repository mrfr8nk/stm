import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOGO = "https://vojhptlreurutrzftatn.supabase.co/storage/v1/object/public/staff-photos/school-logo.png";
const SCHOOL = "St. Mary's High School";
const MOTTO = "Excellence & Integrity";

async function sendEmail(gmailEmail: string, gmailAppPassword: string, to: string, subject: string, html: string) {
  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: gmailEmail, password: gmailAppPassword },
    },
  });
  await client.send({
    from: `${SCHOOL} <${gmailEmail}>`,
    to,
    subject,
    html,
  });
  await client.close();
}

function wrapEmail(content: string): string {
  const yr = new Date().getFullYear();
  return [
    '<!DOCTYPE html><html><head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width">',
    '</head><body style="margin:0;padding:0;',
    'background:#f4f6f9;',
    'font-family:Arial,sans-serif;">',
    '<table width="100%" cellpadding="0" cellspacing="0"',
    ' style="background:#f4f6f9;padding:40px 20px;">',
    '<tr><td align="center">',
    '<table width="600" cellpadding="0" cellspacing="0"',
    ' style="background:#fff;border-radius:16px;',
    'overflow:hidden;',
    'box-shadow:0 4px 24px rgba(0,0,0,0.08);">',
    '<tr><td style="background:#0a3d62;',
    'padding:30px 40px 24px;text-align:center;">',
    `<img src="${LOGO}" alt="Logo"`,
    ' width="80" height="80"',
    ' style="display:block;margin:0 auto 12px;',
    'border-radius:50%;',
    'border:3px solid rgba(255,255,255,0.3);',
    'object-fit:cover;" />',
    `<h1 style="color:#fff;font-size:22px;`,
    'font-weight:700;margin:0 0 4px;">',
    `${SCHOOL}</h1>`,
    `<p style="color:#b8d4e8;font-size:13px;`,
    `font-style:italic;margin:0;">${MOTTO}</p>`,
    '</td></tr>',
    '<tr><td style="height:4px;',
    'background:linear-gradient(90deg,',
    '#e74c3c,#f39c12,#27ae60,#3498db);',
    '"></td></tr>',
    '<tr><td style="padding:40px;">',
    content,
    '</td></tr>',
    '<tr><td style="background:#f8f9fa;',
    'padding:24px 40px;text-align:center;',
    'border-top:1px solid #eee;">',
    `<p style="color:#999;font-size:12px;`,
    `margin:0 0 4px;">&copy; ${yr} ${SCHOOL}</p>`,
    `<p style="color:#bbb;font-size:11px;`,
    `margin:0;font-style:italic;">${MOTTO}</p>`,
    '</td></tr>',
    '</table></td></tr></table>',
    '</body></html>',
  ].join('\n');
}

function inviteContent(role: string, activationLink: string, className?: string): string {
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
  const roleDescription = role === 'student' 
    ? 'As a student, you will be able to view your grades, attendance records, and more.'
    : 'As a teacher, you will be able to manage classes, enter grades, and communicate with students and parents.';
  
  return [
    '<h2 style="color:#2c3e50;font-size:22px;',
    'font-weight:600;margin:0 0 16px;',
    'text-align:center;">You\'re Invited! &#127891;</h2>',
    '<p style="color:#555;font-size:15px;',
    'line-height:1.7;margin:0 0 24px;',
    'text-align:center;">',
    `You have been invited to join <strong>${SCHOOL}</strong>`,
    ` as a <strong>${roleLabel}</strong>.`,
    className ? ` You have been assigned to <strong>${className}</strong>.` : '',
    '</p>',
    '<p style="color:#555;font-size:14px;',
    'line-height:1.7;margin:0 0 24px;',
    'text-align:center;">',
    roleDescription,
    '</p>',
    '<div style="background:#e8f5e9;',
    'border:1px solid #c8e6c9;',
    'border-radius:12px;padding:20px;',
    'margin:0 0 24px;text-align:center;">',
    '<p style="color:#2e7d32;font-size:14px;',
    'font-weight:600;margin:0 0 8px;">',
    '&#9989; Click the button below to activate your account:</p>',
    '<p style="color:#555;font-size:13px;margin:0;">',
    'You will set up your password and personal details.',
    '</p></div>',
    '<table width="100%" cellpadding="0" cellspacing="0">',
    '<tr><td align="center" style="padding:8px 0 24px;">',
    `<a href="${activationLink}"`,
    ' style="display:inline-block;',
    'background:#0a3d62;color:#fff;',
    'text-decoration:none;padding:16px 48px;',
    'border-radius:12px;font-size:16px;',
    'font-weight:600;">',
    '&#128273; Activate My Account</a>',
    '</td></tr></table>',
    '<div style="background:#fff8e1;',
    'border:1px solid #ffe082;',
    'border-radius:12px;padding:16px;',
    'margin-bottom:24px;">',
    '<p style="color:#666;font-size:13px;',
    'line-height:1.6;margin:0;">',
    '<strong style="color:#f57f17;">',
    '&#9201; Important:</strong><br/>',
    '&#8226; This link expires in <strong>7 days</strong><br/>',
    '&#8226; Do not share this link with anyone<br/>',
    '&#8226; Contact school admin if you have any issues',
    '</p></div>',
    '<div style="background:#f0f4f8;',
    'border-radius:8px;padding:16px;',
    'text-align:center;">',
    '<p style="color:#888;font-size:12px;',
    'margin:0 0 8px;">',
    'Can\'t click? Copy this link:</p>',
    '<p style="color:#0a3d62;font-size:11px;',
    'word-break:break-all;margin:0;',
    `font-family:monospace;">${activationLink}</p>`,
    '</div>',
  ].join('\n');
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin access
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

    // Parse request body
    const { email, role, class_id } = await req.json();
    
    if (!email || !role) {
      return new Response(JSON.stringify({ error: "Email and role are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!['student', 'teacher'].includes(role)) {
      return new Response(JSON.stringify({ error: "Role must be 'student' or 'teacher'" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (role === 'student' && !class_id) {
      return new Response(JSON.stringify({ error: "Class is required for students" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (existingUser) {
      return new Response(JSON.stringify({ error: "A user with this email already exists" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get class name if student
    let className: string | undefined;
    if (role === 'student' && class_id) {
      const { data: classData } = await supabase
        .from("classes")
        .select("name")
        .eq("id", class_id)
        .single();
      className = classData?.name;
    }

    // Get site URL for activation link
    const { data: siteUrlSetting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "site_url")
      .single();
    
    const siteUrl = siteUrlSetting?.value || "https://stmarys.vercel.app";

    // Create user with Supabase Auth using invite
    const { data: newUser, error: createError } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/activate-account`,
      data: {
        role,
        class_id: role === 'student' ? class_id : null,
        invited_by: caller.id,
        pending_activation: true,
      },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user role
    await supabase.from("user_roles").insert({
      user_id: newUser.user.id,
      role,
    });

    // Create profile placeholder
    await supabase.from("profiles").insert({
      user_id: newUser.user.id,
      full_name: email.split('@')[0], // Temporary name from email
      account_status: 'pending',
    });

    // Create student/teacher profile
    if (role === 'student') {
      await supabase.from("student_profiles").insert({
        user_id: newUser.user.id,
        class_id,
        admission_year: new Date().getFullYear(),
      });
    } else if (role === 'teacher') {
      await supabase.from("teacher_profiles").insert({
        user_id: newUser.user.id,
        hire_date: new Date().toISOString().split('T')[0],
      });
    }

    // Send custom branded invitation email
    const gmailEmail = Deno.env.get("GMAIL_EMAIL");
    const gmailAppPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (gmailEmail && gmailAppPassword) {
      try {
        // Generate a magic link for account activation
        const { data: magicLinkData } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: {
            redirectTo: `${siteUrl}/activate-account`,
          },
        });

        const activationLink = magicLinkData?.properties?.action_link || `${siteUrl}/activate-account`;
        
        const emailContent = wrapEmail(inviteContent(role, activationLink, className));
        await sendEmail(
          gmailEmail,
          gmailAppPassword,
          email,
          `You're Invited to ${SCHOOL}!`,
          emailContent
        );
      } catch (emailError) {
        console.error("Failed to send invitation email:", emailError);
        // Don't fail the whole operation if email fails
      }
    }

    // Log activity
    await supabase.from("activity_log").insert({
      user_id: caller.id,
      action: "invited_user",
      details: { invited_email: email, role, class_id },
    });

    return new Response(JSON.stringify({ 
      success: true, 
      user_id: newUser.user.id,
      message: `Invitation sent to ${email}` 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

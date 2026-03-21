import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

function inviteContent(link: string, role: string, className?: string): string {
  const roleLabel = role === 'student' ? 'Student' : role === 'teacher' ? 'Teacher' : role;
  return [
    '<h2 style="color:#2c3e50;font-size:22px;',
    'font-weight:600;margin:0 0 16px;',
    'text-align:center;">Account Invitation</h2>',
    '<p style="color:#555;font-size:15px;',
    'line-height:1.7;margin:0 0 24px;',
    'text-align:center;">',
    `You have been invited to join ${SCHOOL} as a <strong>${roleLabel}</strong>.`,
    className ? ` Class: <strong>${className}</strong>.` : '',
    '</p>',
    '<p style="color:#555;font-size:15px;',
    'line-height:1.7;margin:0 0 24px;',
    'text-align:center;">',
    'Click the button below to activate your account',
    ' and set your password.',
    '</p>',
    '<table width="100%" cellpadding="0" cellspacing="0">',
    '<tr><td align="center" style="padding:8px 0 32px;">',
    `<a href="${link}"`,
    ' style="display:inline-block;',
    'background:#0a3d62;color:#fff;',
    'text-decoration:none;padding:16px 48px;',
    'border-radius:12px;font-size:16px;',
    'font-weight:600;">',
    'Activate My Account</a>',
    '</td></tr></table>',
    '<div style="background:#f8f9fa;',
    'border:1px solid #e9ecef;',
    'border-radius:12px;padding:20px;',
    'margin-bottom:24px;">',
    '<p style="color:#666;font-size:13px;',
    'line-height:1.6;margin:0;">',
    '<strong style="color:#e74c3c;">',
    'Important:</strong><br/>',
    '&#8226; This link expires in <strong>7 days</strong><br/>',
    '&#8226; Do not share this link with anyone<br/>',
    '&#8226; Contact school admin if you have questions',
    '</p></div>',
    '<div style="background:#f0f4f8;',
    'border-radius:8px;padding:16px;',
    'text-align:center;">',
    '<p style="color:#888;font-size:12px;',
    'margin:0 0 8px;">',
    'Can\'t click? Copy this link:</p>',
    '<p style="color:#0a3d62;font-size:11px;',
    'word-break:break-all;margin:0;',
    `font-family:monospace;">${link}</p>`,
    '</div>',
  ].join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: { user: caller } } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, role, class_name } = await req.json();

    if (!email || !role) {
      return new Response(JSON.stringify({ error: 'email and role are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['student', 'teacher'].includes(role)) {
      return new Response(JSON.stringify({ error: 'role must be student or teacher' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if email is already used
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());
    if (userExists) {
      return new Response(JSON.stringify({ error: 'An account with this email already exists' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if there's already a pending invitation
    const { data: existingInvite } = await supabase
      .from('pending_invitations')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) {
      return new Response(JSON.stringify({ error: 'A pending invitation already exists for this email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate a unique token
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    // Create invitation record
    const { error: insertError } = await supabase
      .from('pending_invitations')
      .insert({
        email: email.toLowerCase(),
        role,
        class_name: role === 'student' ? class_name : null,
        token,
        expires_at: expiresAt.toISOString(),
        invited_by: caller.id,
        status: 'pending',
      });

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send invitation email
    const gmailEmail = Deno.env.get('GMAIL_EMAIL');
    const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD');

    if (gmailEmail && gmailAppPassword) {
      // Get the site URL from request origin or use a default
      const origin = req.headers.get('origin') || 'https://stm.vercel.app';
      const activationLink = `${origin}/activate?token=${token}`;

      try {
        const html = wrapEmail(inviteContent(activationLink, role, class_name));
        await sendEmail(gmailEmail, gmailAppPassword, email, `${SCHOOL} - Account Invitation`, html);
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        // Don't fail the request, invitation is created
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Invitation sent successfully',
      token, // Return token for testing purposes
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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

function sendEmail(gmailEmail: string, gmailAppPassword: string, to: string | string[], subject: string, html: string) {
  return new Promise(async (resolve, reject) => {
    try {
      const client = new SMTPClient({
        connection: {
          hostname: "smtp.gmail.com",
          port: 465,
          tls: true,
          auth: { username: gmailEmail, password: gmailAppPassword },
        },
      });

      if (Array.isArray(to)) {
        let sent = 0, failed = 0;
        for (const addr of to) {
          try {
            await client.send({
              from: `${SCHOOL} <${gmailEmail}>`,
              to: addr,
              subject,
              html,
            });
            sent++;
          } catch { failed++; }
        }
        await client.close();
        resolve({ sent, failed });
      } else {
        await client.send({
          from: `${SCHOOL} <${gmailEmail}>`,
          to,
          subject,
          html,
        });
        await client.close();
        resolve({ sent: 1, failed: 0 });
      }
    } catch (e) { reject(e); }
  });
}

// Build email - keep lines SHORT to avoid =20 quoted-printable encoding
function wrap(content: string): string {
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
    // Header
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
    // Color bar
    '<tr><td style="height:4px;',
    'background:linear-gradient(90deg,',
    '#e74c3c,#f39c12,#27ae60,#3498db);',
    '"></td></tr>',
    // Content
    '<tr><td style="padding:40px;">',
    content,
    '</td></tr>',
    // Footer
    '<tr><td style="background:#f8f9fa;',
    'padding:24px 40px;text-align:center;',
    'border-top:1px solid #eee;">',
    `<p style="color:#999;font-size:12px;`,
    `margin:0 0 4px;">&copy; ${yr} ${SCHOOL}</p>`,
    `<p style="color:#bbb;font-size:11px;`,
    `margin:0;font-style:italic;">${MOTTO}</p>`,
    '<p style="color:#ccc;font-size:10px;',
    'margin:8px 0 0;">',
    'Automated message. Do not reply.</p>',
    '</td></tr>',
    '</table></td></tr></table>',
    '</body></html>',
  ].join('\n');
}

function otpContent(otp: string, name?: string): string {
  return [
    '<h2 style="color:#2c3e50;font-size:22px;',
    'font-weight:600;margin:0 0 16px;',
    'text-align:center;">Email Verification</h2>',
    '<p style="color:#555;font-size:15px;',
    'line-height:1.7;margin:0 0 8px;',
    'text-align:center;">',
    name ? `Hello <strong>${name}</strong>,` : 'Hello,',
    '</p>',
    '<p style="color:#555;font-size:15px;',
    'line-height:1.7;margin:0 0 24px;',
    'text-align:center;">',
    `Use the code below to complete your registration.`,
    '</p>',
    // OTP display box
    '<div style="background:#0a3d62;',
    'border-radius:16px;padding:32px;',
    'text-align:center;',
    'max-width:320px;margin:0 auto 16px;">',
    '<p style="color:#b8d4e8;font-size:13px;',
    'margin:0 0 12px;letter-spacing:1px;',
    'text-transform:uppercase;">',
    'Verification Code</p>',
    '<p style="color:#fff;font-size:42px;',
    'font-weight:800;letter-spacing:12px;',
    `margin:0;font-family:monospace;">${otp}</p>`,
    '</div>',
    // Copyable code
    '<div style="text-align:center;margin:0 0 24px;">',
    '<p style="color:#888;font-size:12px;',
    'margin:0 0 6px;">',
    'Select and copy the code below:</p>',
    '<table cellpadding="0" cellspacing="0"',
    ' style="margin:0 auto;">',
    '<tr><td style="background:#f8f9fa;',
    'border:2px dashed #0a3d62;',
    'border-radius:8px;padding:12px 28px;">',
    '<span style="font-family:monospace;',
    'font-size:28px;font-weight:800;',
    'letter-spacing:8px;color:#0a3d62;">',
    `${otp}</span>`,
    '</td></tr></table>',
    '</div>',
    // Warning
    '<div style="background:#fff8e1;',
    'border:1px solid #ffe082;',
    'border-radius:12px;padding:16px;',
    'margin-bottom:24px;">',
    '<p style="color:#666;font-size:13px;',
    'line-height:1.6;margin:0;">',
    '<strong style="color:#f57f17;">',
    '&#9201; Important:</strong><br/>',
    '&#8226; Expires in <strong>10 minutes</strong><br/>',
    '&#8226; Do not share this code<br/>',
    '&#8226; Ignore if you did not request this',
    '</p></div>',
  ].join('\n');
}

function resetContent(link: string): string {
  return [
    '<h2 style="color:#2c3e50;font-size:22px;',
    'font-weight:600;margin:0 0 16px;',
    'text-align:center;">Password Reset</h2>',
    '<p style="color:#555;font-size:15px;',
    'line-height:1.7;margin:0 0 24px;',
    'text-align:center;">',
    'Click the button below to set a new password.',
    '</p>',
    '<table width="100%" cellpadding="0" cellspacing="0">',
    '<tr><td align="center" style="padding:8px 0 32px;">',
    `<a href="${link}"`,
    ' style="display:inline-block;',
    'background:#0a3d62;color:#fff;',
    'text-decoration:none;padding:16px 48px;',
    'border-radius:12px;font-size:16px;',
    'font-weight:600;">',
    '&#128273; Reset My Password</a>',
    '</td></tr></table>',
    '<div style="background:#f8f9fa;',
    'border:1px solid #e9ecef;',
    'border-radius:12px;padding:20px;',
    'margin-bottom:24px;">',
    '<p style="color:#666;font-size:13px;',
    'line-height:1.6;margin:0;">',
    '<strong style="color:#e74c3c;">',
    '&#9888; Security Notice:</strong><br/>',
    '&#8226; Link expires in <strong>24 hours</strong><br/>',
    '&#8226; If you didn\'t request this, ignore it<br/>',
    '&#8226; Never share this link',
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

function resultsContent(portalUrl: string): string {
  return [
    '<h2 style="color:#2c3e50;font-size:22px;',
    'font-weight:600;margin:0 0 16px;',
    'text-align:center;">Results Published!</h2>',
    '<p style="color:#555;font-size:15px;',
    'line-height:1.7;margin:0 0 24px;',
    'text-align:center;">',
    `${SCHOOL} has released report cards.`,
    ' You can now view academic results.',
    '</p>',
    '<div style="background:#0a3d62;',
    'border-radius:16px;padding:32px;',
    'text-align:center;margin:0 auto 24px;">',
    '<p style="color:#fff;font-size:20px;',
    'font-weight:700;margin:0 0 8px;">',
    'Report Cards Are Live</p>',
    '<p style="color:#b8d4e8;font-size:13px;',
    'margin:0;">Log in to view grades,',
    ' positions, and comments.</p>',
    '</div>',
    '<table width="100%" cellpadding="0" cellspacing="0">',
    '<tr><td align="center" style="padding:8px 0 24px;">',
    `<a href="${portalUrl}"`,
    ' style="display:inline-block;',
    'background:#27ae60;color:#fff;',
    'text-decoration:none;padding:16px 48px;',
    'border-radius:12px;font-size:16px;',
    'font-weight:600;">',
    '&#128202; View Results Now</a>',
    '</td></tr></table>',
    '<div style="background:#f0f4f8;',
    'border-radius:8px;padding:16px;',
    'text-align:center;">',
    '<p style="color:#888;font-size:12px;margin:0;">',
    'Contact school admin for questions.</p>',
    '</div>',
  ].join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const gmailEmail = Deno.env.get('GMAIL_EMAIL')!;
    const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD')!;

    if (!gmailEmail || !gmailAppPassword) {
      throw new Error('Gmail credentials not configured');
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const { email, type, redirect_url, full_name, emails } = body;

    // Bulk results notification
    if (type === 'results_available') {
      if (!emails?.length) {
        return new Response(
          JSON.stringify({ error: 'No emails provided' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const portalUrl = supabaseUrl
        .replace('.supabase.co', '.lovable.app') + '/login';
      const subject = `Results Are Now Available - ${SCHOOL}`;
      const html = wrap(resultsContent(portalUrl));
      const result: any = await sendEmail(
        gmailEmail, gmailAppPassword, emails, subject, html
      );
      return new Response(
        JSON.stringify({ success: true, ...result, total: emails.length }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let subject = '';
    let html = '';

    if (type === 'reset_password') {
      const { data: linkData, error: linkError } = await supabase
        .auth.admin.generateLink({
          type: 'recovery',
          email,
          options: {
            redirectTo: redirect_url ||
              supabaseUrl.replace(
                '.supabase.co',
                '.lovableproject.com'
              ) + '/reset-password',
          },
        });

      if (linkError) {
        return new Response(
          JSON.stringify({ error: linkError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const actionLink = linkData?.properties?.action_link || '';
      subject = `Password Reset - ${SCHOOL}`;
      html = wrap(resetContent(actionLink));

    } else if (type === 'verification_otp') {
      const otp = Math.floor(
        100000 + Math.random() * 900000
      ).toString();
      const otpKey = `otp_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const otpData = JSON.stringify({
        code: otp,
        expires: Date.now() + 10 * 60 * 1000,
        email: email.toLowerCase(),
      });

      await supabase.from('system_settings').upsert({
        key: otpKey,
        value: otpData,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

      subject = `Verification Code - ${SCHOOL}`;
      html = wrap(otpContent(otp, full_name));

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid email type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    await sendEmail(gmailEmail, gmailAppPassword, email, subject, html);

    return new Response(
      JSON.stringify({ success: true, message: `Email sent to ${email}` }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error('Error in send-branded-email:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

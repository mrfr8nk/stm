import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { email, type, redirect_url } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let subject = '';
    let htmlBody = '';
    const schoolName = "St. Mary's High School";
    const motto = "Excellence & Integrity";

    if (type === 'reset_password') {
      // Generate a password reset link using admin API
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: redirect_url || `${supabaseUrl.replace('.supabase.co', '.lovableproject.com')}/reset-password`,
        },
      });

      if (linkError) {
        console.error('Link generation error:', linkError);
        return new Response(JSON.stringify({ error: linkError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extract the action link
      const actionLink = linkData?.properties?.action_link || '';

      subject = `🔐 Password Reset - ${schoolName}`;
      htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- Header with school branding -->
        <tr><td style="background:linear-gradient(135deg,#0a3d62 0%,#1a5276 50%,#0a3d62 100%);padding:40px 40px 30px;text-align:center;">
          <div style="width:80px;height:80px;background:#ffffff;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.2);">
            <img src="cid:school-logo" alt="${schoolName}" style="width:56px;height:56px;border-radius:50%;object-fit:contain;" />
          </div>
          <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0 0 4px;letter-spacing:0.5px;">${schoolName}</h1>
          <p style="color:#b8d4e8;font-size:13px;font-style:italic;margin:0;">${motto}</p>
        </td></tr>

        <!-- Accent line -->
        <tr><td style="height:4px;background:linear-gradient(90deg,#e74c3c,#f39c12,#27ae60,#3498db);"></td></tr>

        <!-- Content -->
        <tr><td style="padding:40px;">
          <h2 style="color:#2c3e50;font-size:22px;font-weight:600;margin:0 0 16px;text-align:center;">Password Reset Request</h2>
          
          <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 24px;text-align:center;">
            We received a request to reset your password for your ${schoolName} portal account. Click the button below to set a new password.
          </p>

          <!-- CTA Button -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 32px;">
              <a href="${actionLink}" style="display:inline-block;background:linear-gradient(135deg,#0a3d62,#1a5276);color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:12px;font-size:16px;font-weight:600;letter-spacing:0.5px;box-shadow:0 4px 16px rgba(10,61,98,0.3);">
                🔑 Reset My Password
              </a>
            </td></tr>
          </table>

          <!-- Security notice -->
          <div style="background:#f8f9fa;border:1px solid #e9ecef;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="color:#666;font-size:13px;line-height:1.6;margin:0;">
              <strong style="color:#e74c3c;">⚠️ Security Notice:</strong><br/>
              • This link expires in <strong>24 hours</strong><br/>
              • If you didn't request this reset, please ignore this email<br/>
              • Your password won't change until you create a new one<br/>
              • Never share this link with anyone
            </p>
          </div>

          <!-- Fallback link -->
          <div style="background:#f0f4f8;border-radius:8px;padding:16px;text-align:center;">
            <p style="color:#888;font-size:12px;margin:0 0 8px;">Can't click the button? Copy and paste this link:</p>
            <p style="color:#0a3d62;font-size:11px;word-break:break-all;margin:0;font-family:monospace;">${actionLink}</p>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f8f9fa;padding:24px 40px;text-align:center;border-top:1px solid #eee;">
          <p style="color:#999;font-size:12px;margin:0 0 4px;">© ${new Date().getFullYear()} ${schoolName}</p>
          <p style="color:#bbb;font-size:11px;margin:0;font-style:italic;">${motto}</p>
          <p style="color:#ccc;font-size:10px;margin:8px 0 0;">This is an automated message. Please do not reply to this email.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid email type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send email via Gmail SMTP
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: gmailEmail,
          password: gmailAppPassword,
        },
      },
    });

    await client.send({
      from: `${schoolName} <${gmailEmail}>`,
      to: email,
      subject: subject,
      content: "Please view this email in an HTML-compatible email client.",
      html: htmlBody,
    });

    await client.close();

    return new Response(JSON.stringify({ success: true, message: `Email sent to ${email}` }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-branded-email:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

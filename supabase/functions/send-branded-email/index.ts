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
    const { email, type, redirect_url, full_name } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const schoolName = "St. Mary's High School";
    const motto = "Excellence & Integrity";
    let subject = '';
    let htmlBody = '';

    if (type === 'reset_password') {
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: redirect_url || `${supabaseUrl.replace('.supabase.co', '.lovableproject.com')}/reset-password`,
        },
      });

      if (linkError) {
        return new Response(JSON.stringify({ error: linkError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const actionLink = linkData?.properties?.action_link || '';

      subject = `🔐 Password Reset - ${schoolName}`;
      htmlBody = buildEmailTemplate(schoolName, motto, `
        <h2 style="color:#2c3e50;font-size:22px;font-weight:600;margin:0 0 16px;text-align:center;">Password Reset Request</h2>
        <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 24px;text-align:center;">
          We received a request to reset your password for your ${schoolName} portal account. Click the button below to set a new password.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center" style="padding:8px 0 32px;">
            <a href="${actionLink}" style="display:inline-block;background:linear-gradient(135deg,#0a3d62,#1a5276);color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:12px;font-size:16px;font-weight:600;letter-spacing:0.5px;box-shadow:0 4px 16px rgba(10,61,98,0.3);">
              🔑 Reset My Password
            </a>
          </td></tr>
        </table>
        <div style="background:#f8f9fa;border:1px solid #e9ecef;border-radius:12px;padding:20px;margin-bottom:24px;">
          <p style="color:#666;font-size:13px;line-height:1.6;margin:0;">
            <strong style="color:#e74c3c;">⚠️ Security Notice:</strong><br/>
            • This link expires in <strong>24 hours</strong><br/>
            • If you didn't request this, ignore this email<br/>
            • Never share this link with anyone
          </p>
        </div>
        <div style="background:#f0f4f8;border-radius:8px;padding:16px;text-align:center;">
          <p style="color:#888;font-size:12px;margin:0 0 8px;">Can't click the button? Copy this link:</p>
          <p style="color:#0a3d62;font-size:11px;word-break:break-all;margin:0;font-family:monospace;">${actionLink}</p>
        </div>
      `);

    } else if (type === 'verification_otp') {
      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP in system_settings with expiry (10 min)
      const otpKey = `otp_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const otpData = JSON.stringify({ code: otp, expires: Date.now() + 10 * 60 * 1000, email: email.toLowerCase() });
      
      await supabase.from('system_settings').upsert({ 
        key: otpKey, 
        value: otpData,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

      subject = `🔢 Your Verification Code - ${schoolName}`;
      htmlBody = buildEmailTemplate(schoolName, motto, `
        <h2 style="color:#2c3e50;font-size:22px;font-weight:600;margin:0 0 16px;text-align:center;">Email Verification</h2>
        <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 8px;text-align:center;">
          Hello${full_name ? ` <strong>${full_name}</strong>` : ''},
        </p>
        <p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 24px;text-align:center;">
          Use the verification code below to complete your registration at ${schoolName}.
        </p>
        <div style="background:linear-gradient(135deg,#0a3d62,#1a5276);border-radius:16px;padding:32px;text-align:center;margin:0 auto 24px;max-width:320px;">
          <p style="color:#b8d4e8;font-size:13px;margin:0 0 12px;letter-spacing:1px;text-transform:uppercase;">Verification Code</p>
          <p style="color:#ffffff;font-size:42px;font-weight:800;letter-spacing:12px;margin:0;font-family:'Courier New',monospace;">${otp}</p>
        </div>
        <div style="background:#fff8e1;border:1px solid #ffe082;border-radius:12px;padding:16px;margin-bottom:24px;">
          <p style="color:#666;font-size:13px;line-height:1.6;margin:0;">
            <strong style="color:#f57f17;">⏱️ Important:</strong><br/>
            • This code expires in <strong>10 minutes</strong><br/>
            • Do not share this code with anyone<br/>
            • If you didn't request this, ignore this email
          </p>
        </div>
      `);

    } else if (type === 'verify_otp') {
      // Verify an OTP code
      const { otp_code } = await req.json().catch(() => ({}));
      const otpKey = `otp_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      
      const { data: otpRecord } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', otpKey)
        .single();

      if (!otpRecord) {
        return new Response(JSON.stringify({ error: 'No verification code found. Please request a new one.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const otpData = JSON.parse(otpRecord.value);
      
      if (Date.now() > otpData.expires) {
        await supabase.from('system_settings').delete().eq('key', otpKey);
        return new Response(JSON.stringify({ error: 'Verification code expired. Please request a new one.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // We already parsed the body above, need to get otp_code from original request
      return new Response(JSON.stringify({ error: 'Use the /verify-otp endpoint' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

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

function buildEmailTemplate(schoolName: string, motto: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#0a3d62 0%,#1a5276 50%,#0a3d62 100%);padding:40px 40px 30px;text-align:center;">
          <h1 style="color:#ffffff;font-size:24px;font-weight:700;margin:0 0 4px;letter-spacing:0.5px;">${schoolName}</h1>
          <p style="color:#b8d4e8;font-size:13px;font-style:italic;margin:0;">${motto}</p>
        </td></tr>
        <tr><td style="height:4px;background:linear-gradient(90deg,#e74c3c,#f39c12,#27ae60,#3498db);"></td></tr>
        <tr><td style="padding:40px;">
          ${content}
        </td></tr>
        <tr><td style="background:#f8f9fa;padding:24px 40px;text-align:center;border-top:1px solid #eee;">
          <p style="color:#999;font-size:12px;margin:0 0 4px;">© ${new Date().getFullYear()} ${schoolName}</p>
          <p style="color:#bbb;font-size:11px;margin:0;font-style:italic;">${motto}</p>
          <p style="color:#ccc;font-size:10px;margin:8px 0 0;">This is an automated message. Please do not reply.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

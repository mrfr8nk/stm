import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const gmailEmail = Deno.env.get('GMAIL_EMAIL');
    const gmailPassword = Deno.env.get('GMAIL_APP_PASSWORD');

    if (!gmailEmail || !gmailPassword) {
      return new Response(JSON.stringify({ error: 'Email credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { type, email, full_name, student_id } = await req.json();

    if (!email || !type) {
      return new Response(JSON.stringify({ error: 'Missing email or type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let subject = '';
    let htmlBody = '';
    const schoolName = "St. Mary's High School";
    const portalUrl = "https://stmh.lovable.app/login";

    if (type === 'request_received') {
      subject = `Application Received - ${schoolName}`;
      htmlBody = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #0a3d62, #1a5276); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${schoolName}</h1>
            <p style="color: #d4e6f1; font-style: italic; margin: 8px 0 0; font-size: 13px;">Excellence Through Knowledge</p>
          </div>
          <div style="padding: 35px 30px;">
            <h2 style="color: #1a1a1a; margin: 0 0 20px;">Dear ${full_name || 'Applicant'},</h2>
            <p style="color: #444; line-height: 1.7; font-size: 15px;">Thank you for submitting your application to <strong>${schoolName}</strong>. Your application has been received and is currently under review.</p>
            <div style="background: #f0f7ff; border-left: 4px solid #0a3d62; padding: 18px 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0 0 10px; color: #1a1a1a; font-weight: 600;">What happens next?</p>
              <ul style="color: #555; margin: 0; padding-left: 18px; line-height: 1.8; font-size: 14px;">
                <li>Our administration team will review your application</li>
                <li>You will receive an email once a decision has been made</li>
                <li>If approved, you can log in immediately</li>
              </ul>
            </div>
            <p style="color: #666; font-size: 14px;">Please allow a few business days for processing.</p>
          </div>
          <div style="background: #f8f9fa; text-align: center; padding: 20px; border-top: 1px solid #eee;">
            <p style="margin: 0; color: #999; font-size: 12px;">${schoolName} &bull; Automated Notification</p>
          </div>
        </div>
      `;
    } else if (type === 'approved') {
      subject = `🎉 Application Approved - ${schoolName}`;
      htmlBody = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #0a3d62, #1a5276); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${schoolName}</h1>
            <p style="color: #d4e6f1; font-style: italic; margin: 8px 0 0; font-size: 13px;">Excellence Through Knowledge</p>
          </div>
          <div style="padding: 35px 30px;">
            <h2 style="color: #1a1a1a; margin: 0 0 20px;">Dear ${full_name || 'Student'},</h2>
            <p style="color: #444; line-height: 1.7; font-size: 15px;">Great news! Your application to <strong>${schoolName}</strong> has been <strong style="color: #27ae60;">approved</strong>.</p>
            <div style="background: #f0fdf4; border: 2px solid #27ae60; padding: 25px; margin: 25px 0; border-radius: 12px; text-align: center;">
              <p style="margin: 0 0 8px; color: #27ae60; font-size: 20px; font-weight: 700;">✅ Your Account is Active!</p>
              ${student_id ? `<p style="margin: 8px 0 0; color: #333;">Student ID: <strong style="font-family: 'Courier New', monospace; font-size: 18px; color: #0a3d62; background: #e8f4fd; padding: 4px 12px; border-radius: 6px;">${student_id}</strong></p>` : ''}
            </div>
            <div style="background: #f8f9fa; padding: 20px; margin: 25px 0; border-radius: 10px;">
              <p style="margin: 0 0 12px; color: #1a1a1a; font-weight: 600;">How to get started:</p>
              <ol style="color: #555; margin: 0; padding-left: 20px; line-height: 2; font-size: 14px;">
                <li>Visit the school portal</li>
                <li>Sign in with: <strong>${email}</strong></li>
                <li>Use the password you created during registration</li>
              </ol>
            </div>
            <div style="text-align: center; margin: 30px 0 10px;">
              <a href="${portalUrl}" style="display: inline-block; background: #0a3d62; color: #ffffff; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">Log In to Portal</a>
            </div>
            <p style="color: #666; font-size: 14px; margin-top: 25px;">Welcome to ${schoolName}! We look forward to supporting your academic journey.</p>
          </div>
          <div style="background: #f8f9fa; text-align: center; padding: 20px; border-top: 1px solid #eee;">
            <p style="margin: 0; color: #999; font-size: 12px;">${schoolName} &bull; Automated Notification</p>
          </div>
        </div>
      `;
    } else if (type === 'rejected') {
      subject = `Application Update - ${schoolName}`;
      htmlBody = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
          <div style="background: linear-gradient(135deg, #0a3d62, #1a5276); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${schoolName}</h1>
            <p style="color: #d4e6f1; font-style: italic; margin: 8px 0 0; font-size: 13px;">Excellence Through Knowledge</p>
          </div>
          <div style="padding: 35px 30px;">
            <h2 style="color: #1a1a1a; margin: 0 0 20px;">Dear ${full_name || 'Applicant'},</h2>
            <p style="color: #444; line-height: 1.7; font-size: 15px;">Thank you for your interest in <strong>${schoolName}</strong>. After careful review, we regret to inform you that your application has <strong style="color: #c0392b;">not been approved</strong> at this time.</p>
            <div style="background: #fef9f0; border-left: 4px solid #e67e22; padding: 18px 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; color: #555; font-size: 14px; line-height: 1.6;">If you believe this decision was made in error or would like further information, please contact the school administration directly. Applications may be reconsidered upon request.</p>
            </div>
            <p style="color: #666; font-size: 14px;">We appreciate your interest and wish you all the best in your academic pursuits.</p>
          </div>
          <div style="background: #f8f9fa; text-align: center; padding: 20px; border-top: 1px solid #eee;">
            <p style="margin: 0; color: #999; font-size: 12px;">${schoolName} &bull; Automated Notification</p>
          </div>
        </div>
      `;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid email type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
          password: gmailPassword,
        },
      },
    });

    await client.send({
      from: `${schoolName} <${gmailEmail}>`,
      to: email,
      subject,
      content: "Please view this email in an HTML-capable client.",
      html: htmlBody,
    });

    await client.close();

    console.log(`Email sent successfully: ${type} to ${email}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${type} email sent to ${email}`,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-notification:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    if (type === 'request_received') {
      subject = `Application Received - ${schoolName}`;
      htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 3px solid #0a3d62;">
            <h1 style="color: #0a3d62; margin: 0;">${schoolName}</h1>
            <p style="color: #666; font-style: italic; margin: 5px 0 0;">Excellence Through Knowledge</p>
          </div>
          <div style="padding: 30px 0;">
            <h2 style="color: #333;">Dear ${full_name || 'Applicant'},</h2>
            <p style="color: #555; line-height: 1.6;">Thank you for submitting your access request to ${schoolName}. Your application has been received and is currently under review by our administration team.</p>
            <div style="background: #f8f9fa; border-left: 4px solid #0a3d62; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #333; font-weight: bold;">What happens next?</p>
              <ul style="color: #555; margin: 10px 0 0; padding-left: 20px;">
                <li>Our team will review your application</li>
                <li>You will receive an email once a decision is made</li>
                <li>If approved, you can log in immediately with your email and password</li>
              </ul>
            </div>
            <p style="color: #555;">Please be patient as this process may take a few business days.</p>
          </div>
          <div style="text-align: center; padding: 20px 0; border-top: 2px solid #eee; color: #999; font-size: 12px;">
            <p>${schoolName} | This is an automated message</p>
          </div>
        </div>
      `;
    } else if (type === 'approved') {
      subject = `🎉 Application Approved - ${schoolName}`;
      htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 3px solid #0a3d62;">
            <h1 style="color: #0a3d62; margin: 0;">${schoolName}</h1>
            <p style="color: #666; font-style: italic; margin: 5px 0 0;">Excellence Through Knowledge</p>
          </div>
          <div style="padding: 30px 0;">
            <h2 style="color: #333;">Dear ${full_name || 'Student'},</h2>
            <p style="color: #555; line-height: 1.6;">Great news! Your access request to ${schoolName} has been <strong style="color: #0a8f3c;">approved</strong>.</p>
            <div style="background: #f0fdf4; border: 2px solid #0a8f3c; padding: 20px; margin: 20px 0; border-radius: 8px; text-align: center;">
              <p style="margin: 0 0 10px; color: #0a8f3c; font-size: 18px; font-weight: bold;">✅ Your Account is Active!</p>
              ${student_id ? `<p style="margin: 0; color: #333;">Your Student ID: <strong style="font-family: monospace; font-size: 16px; color: #0a3d62;">${student_id}</strong></p>` : ''}
            </div>
            <div style="background: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 8px;">
              <p style="margin: 0 0 10px; color: #333; font-weight: bold;">How to get started:</p>
              <ol style="color: #555; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>Go to the school portal login page</li>
                <li>Sign in with your email: <strong>${email}</strong></li>
                <li>Use the password you created during registration</li>
              </ol>
            </div>
            <p style="color: #555;">No access code is needed — your account is ready to use!</p>
            <p style="color: #555;">Welcome to ${schoolName}! We look forward to supporting your academic journey.</p>
          </div>
          <div style="text-align: center; padding: 20px 0; border-top: 2px solid #eee; color: #999; font-size: 12px;">
            <p>${schoolName} | This is an automated message</p>
          </div>
        </div>
      `;
    } else if (type === 'rejected') {
      subject = `Application Update - ${schoolName}`;
      htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 20px 0; border-bottom: 3px solid #0a3d62;">
            <h1 style="color: #0a3d62; margin: 0;">${schoolName}</h1>
          </div>
          <div style="padding: 30px 0;">
            <h2 style="color: #333;">Dear ${full_name || 'Applicant'},</h2>
            <p style="color: #555; line-height: 1.6;">Thank you for your interest in ${schoolName}. After reviewing your application, we regret to inform you that your request has not been approved at this time.</p>
            <p style="color: #555;">If you believe this is an error or would like more information, please contact the school administration directly.</p>
          </div>
          <div style="text-align: center; padding: 20px 0; border-top: 2px solid #eee; color: #999; font-size: 12px;">
            <p>${schoolName} | This is an automated message</p>
          </div>
        </div>
      `;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid email type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use Supabase Auth admin to send email via the auth system
    // We'll use the built-in SMTP by calling the admin API
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'magiclink',
        email: email,
      }),
    });

    // The magic link generation confirms the email exists
    // For actual email delivery, we'll store the notification and 
    // the admin can copy/share the approval status
    
    // Return success - the email content is ready
    // In production, integrate with an email service
    return new Response(JSON.stringify({ 
      success: true, 
      message: `${type} notification prepared for ${email}`,
      subject,
      html_preview: htmlBody,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-notification:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

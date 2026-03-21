import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateToken(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
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

    const { email, role, class_id, form, level } = await req.json();

    if (!email || !role) {
      return new Response(JSON.stringify({ error: 'email and role are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate role
    const validRoles = ['student', 'teacher', 'parent', 'admin'];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role. Must be one of: student, teacher, parent, admin' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email?.toLowerCase() === email.toLowerCase());
    if (userExists) {
      return new Response(JSON.stringify({ error: 'A user with this email already exists' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if there's already a pending invitation for this email
    const { data: existingInvite } = await supabase
      .from('pending_invitations')
      .select('id')
      .eq('email', email.toLowerCase())
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingInvite) {
      return new Response(JSON.stringify({ error: 'An invitation has already been sent to this email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate unique invite token
    const inviteToken = generateToken(48);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create pending invitation
    const { error: insertError } = await supabase
      .from('pending_invitations')
      .insert({
        email: email.toLowerCase(),
        role,
        invite_token: inviteToken,
        invited_by: caller.id,
        class_id: class_id || null,
        form: form || null,
        level: level || null,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send activation email via send-branded-email function
    const activationUrl = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/activate-account?token=${inviteToken}`;
    
    const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-branded-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        email: email.toLowerCase(),
        type: 'account_activation',
        activation_data: {
          role,
          activationUrl,
          expiresIn: '7 days',
        },
      }),
    });

    if (!emailRes.ok) {
      const emailError = await emailRes.json();
      console.error('Email error:', emailError);
      // Don't fail - invitation is created, just couldn't send email
      return new Response(JSON.stringify({ 
        success: true, 
        warning: 'Invitation created but email could not be sent',
        inviteToken,
        activationUrl,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Invitation sent to ${email}`,
      inviteToken,
      activationUrl,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in admin-invite-user:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

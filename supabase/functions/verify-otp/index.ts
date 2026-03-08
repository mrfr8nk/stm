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
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { email, otp_code } = await req.json();

    if (!email || !otp_code) {
      return new Response(JSON.stringify({ error: 'Email and OTP code are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const otpKey = `otp_${email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    const { data: otpRecord } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', otpKey)
      .single();

    if (!otpRecord) {
      return new Response(JSON.stringify({ valid: false, error: 'No verification code found. Please request a new one.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const otpData = JSON.parse(otpRecord.value);

    if (Date.now() > otpData.expires) {
      await supabase.from('system_settings').delete().eq('key', otpKey);
      return new Response(JSON.stringify({ valid: false, error: 'Code expired. Please request a new one.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (otpData.code !== otp_code.trim()) {
      return new Response(JSON.stringify({ valid: false, error: 'Invalid code. Please try again.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // OTP is valid - clean up
    await supabase.from('system_settings').delete().eq('key', otpKey);

    return new Response(JSON.stringify({ valid: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in verify-otp:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

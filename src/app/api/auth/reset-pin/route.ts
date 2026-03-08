import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { formatPinAsPassword } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const { phone, pin } = await request.json();

    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    if (!pin || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'Pin must be exactly 4 digits' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: otpData, error: otpError } = await supabaseAdmin
      .from('otp_codes')
      .select('*')
      .eq('phone', phone)
      .eq('used', true)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpData) {
      return NextResponse.json({ error: 'OTP verification required' }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('phone', phone)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'No account found with this phone number' }, { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.id,
      { password: formatPinAsPassword(pin) }
    );

    if (updateError) {
      console.error('Pin update error:', updateError);
      return NextResponse.json({ error: updateError.message || 'Failed to update Pin' }, { status: 400 });
    }

    return NextResponse.json({ success: true, email: profile.email });
  } catch (error: any) {
    console.error('Reset Pin API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

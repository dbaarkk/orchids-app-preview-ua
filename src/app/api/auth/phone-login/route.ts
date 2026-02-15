import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, phone, blocked')
      .eq('phone', phone)
      .limit(1)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'No account found with this phone number. Please sign up first.' }, { status: 404 });
    }

      if (profile.blocked) {
        return NextResponse.json({ error: 'Your account has been blocked. Contact support.' }, { status: 403 });
      }

      if (profile.email?.toLowerCase() === 'theurbanauto@gmail.com') {
        return NextResponse.json({ error: 'Admin account must use email login.' }, { status: 403 });
      }

    const tempPassword = `otp_${phone}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      password: tempPassword,
    });

    if (updateError) {
      return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      email: profile.email,
      tempPassword,
    });
  } catch (error: any) {
    console.error('Phone login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

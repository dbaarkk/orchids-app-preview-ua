import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { phone, password } = await request.json();

    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit phone number' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, blocked')
      .eq('phone', phone)
      .limit(1)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'No account found with this phone number' }, { status: 404 });
    }

      if (profile.blocked) {
        return NextResponse.json({ error: 'Your account has been blocked. Contact support.' }, { status: 403 });
      }

      if (profile.email?.toLowerCase() === 'theurbanauto@gmail.com') {
        return NextResponse.json({ error: 'Admin account must use email login.' }, { status: 403 });
      }

    return NextResponse.json({ email: profile.email });
  } catch (error: any) {
    console.error('Phone password login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

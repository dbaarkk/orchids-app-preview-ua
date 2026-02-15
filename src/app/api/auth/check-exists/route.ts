import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, phone } = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    if (email) {
      const { data: emailUser } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .limit(1)
        .single();

      if (emailUser) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
      }
    }

    if (phone) {
      const { data: phoneUser } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('phone', phone)
        .limit(1)
        .single();

      if (phoneUser) {
        return NextResponse.json({ error: 'Number is already registered' }, { status: 409 });
      }
    }

    return NextResponse.json({ available: true });
  } catch (error: any) {
    console.error('Check exists error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

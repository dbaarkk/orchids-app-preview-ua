import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log('Signup request received');
  try {
    const body = await request.text();
    console.log('Signup body:', body);
    
    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      console.error('Failed to parse signup body as JSON:', body);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    
    const { name, email, phone, password, otpVerified } = data;

    if (!email || !password || !name || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create user and auto-confirm email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, phone: phone }
    });

    if (userError) {
      if (userError.message.toLowerCase().includes('already registered') || userError.message.toLowerCase().includes('already exists')) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
      }
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }

    if (!userData.user) {
      return NextResponse.json({ error: 'Failed to create user record' }, { status: 500 });
    }

    // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert([
          {
            id: userData.user.id,
            email,
            full_name: name,
            phone: phone,
            verified: otpVerified === true ? true : false,
            blocked: false,
            updated_at: new Date().toISOString()
          }
        ], { onConflict: 'id' });

    if (profileError) {
      console.error('Profile Creation Error:', profileError);
      // Even if profile fails, user is created. But we should try to handle it.
      return NextResponse.json({ error: 'User created but profile setup failed' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: userData.user.id,
        email: email,
        name: name,
        phone: phone
      }
    });
  } catch (error: any) {
    console.error('Signup API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId, name, email } = await request.json();

    if (!userId || (!name && !email)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Update auth.users if email or name changes
    const authUpdateData: any = {};
    if (email) authUpdateData.email = email;



    // user_metadata
    const { data: user, error: userFetchError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (!userFetchError && user?.user) {
        authUpdateData.user_metadata = {
            ...user.user.user_metadata,
            ...(name ? { full_name: name } : {})
        };

        const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          authUpdateData
        );

        if (authUpdateError) {
          console.error('Auth User Update Error:', authUpdateError);
          // If email update fails (e.g. already in use), return error
          return NextResponse.json({ error: authUpdateError.message }, { status: 400 });
        }
    }

    // 2. Update profiles table
    const updateData: any = {};
    if (name) updateData.full_name = name;
    if (email) updateData.email = email;

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (profileError) {
      console.error('Profile Update Error:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }


    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Update Profile API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

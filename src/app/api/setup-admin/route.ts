import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { formatPinAsPassword } from '@/lib/utils';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const adminEmail = 'theurbanauto@gmail.com';
    const adminPin = '1234';
    const hashedPassword = formatPinAsPassword(adminPin);

    // 1. Check if admin exists
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw listError;

    const existingAdmin = users.find(u => u.email === adminEmail);

    if (existingAdmin) {
      // Update existing admin
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingAdmin.id,
        { password: hashedPassword, email_confirm: true }
      );
      if (updateError) throw updateError;

      // Ensure profile exists and is verified
      await supabaseAdmin.from('profiles').upsert({
        id: existingAdmin.id,
        email: adminEmail,
        full_name: 'Admin',
        verified: true
      });

      return NextResponse.json({ message: 'Admin updated successfully' });
    } else {
      // Create new admin
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: hashedPassword,
        email_confirm: true,
        user_metadata: { full_name: 'Admin' }
      });
      if (createError) throw createError;

      // Create profile
      await supabaseAdmin.from('profiles').upsert({
        id: newUser.user.id,
        email: adminEmail,
        full_name: 'Admin',
        verified: true
      });

      return NextResponse.json({ message: 'Admin created successfully' });
    }
  } catch (error: any) {
    console.error('Setup admin error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

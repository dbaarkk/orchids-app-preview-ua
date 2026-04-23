import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { formatPinAsPassword } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const { email, pin } = await request.json();

    if (email?.toLowerCase() === 'theurbanauto@gmail.com') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      // Fix from root: If admin types 1234, we ensure the account exists and uses 1234.
      // This solves the "invalid credentials" issue for the desired pin.
      if (pin === '1234') {
        const hashedPassword = formatPinAsPassword('1234');

        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          perPage: 1000
        });
        if (listError) throw listError;

        let adminUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

        if (adminUser) {
          await supabaseAdmin.auth.admin.updateUserById(adminUser.id, {
            password: hashedPassword,
            email_confirm: true
          });
        } else {
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email.toLowerCase(),
            password: hashedPassword,
            email_confirm: true,
            user_metadata: { full_name: 'Admin' }
          });
          if (createError) throw createError;
          adminUser = newUser.user;
        }

        if (adminUser) {
          await supabaseAdmin.from('profiles').upsert({
            id: adminUser.id,
            email: email.toLowerCase(),
            full_name: 'Admin',
            verified: true,
            blocked: false
          });
        }
      }

      // Also update all Pending bookings to Confirmed as requested
      await supabaseAdmin
        .from('bookings')
        .update({ status: 'Confirmed' })
        .eq('status', 'Pending');
    }

    return NextResponse.json({ email });
  } catch (error: any) {
    console.error('Admin pre-login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

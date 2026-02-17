import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Use service role to bypass RLS for public config
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data, error } = await adminClient
      .from('app_config')
      .select('key, value')
      .in('key', ['signup_carousel', 'payment_config']);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const config: Record<string, any> = {};
    data.forEach(item => { config[item.key] = item.value; });

    return NextResponse.json({ data: config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

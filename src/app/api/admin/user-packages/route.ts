import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function PUT(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
  );

  try {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authErr || !user || user.email?.toLowerCase() !== 'pilot@hashtaggarage.in') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

    const { packageId, remaining_allowances } = await req.json();

    if (!packageId || !remaining_allowances) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('user_packages')
      .update({ remaining_allowances })
      .eq('id', packageId)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, package: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

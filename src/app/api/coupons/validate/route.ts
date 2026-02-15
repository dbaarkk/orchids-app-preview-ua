import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { code, userId } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
    }

    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('code, discount_percent, active, user_id, first_booking_only')
      .eq('code', code.trim().toUpperCase())
      .eq('active', true);

    if (error || !coupons || coupons.length === 0) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 404 });
    }

    const coupon = coupons.find(c => !c.user_id) || coupons.find(c => c.user_id === userId);

    if (!coupon) {
      return NextResponse.json({ error: 'This coupon is not available for you' }, { status: 400 });
    }

    if (coupon.user_id && coupon.user_id !== userId) {
      return NextResponse.json({ error: 'This coupon is not available for you' }, { status: 400 });
    }

    if (coupon.first_booking_only && userId) {
      const { count } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if ((count ?? 0) > 0) {
        return NextResponse.json({ error: 'This coupon is only valid for your first booking' }, { status: 400 });
      }
    }

    return NextResponse.json({
      valid: true,
      code: coupon.code,
      discount_percent: coupon.discount_percent,
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

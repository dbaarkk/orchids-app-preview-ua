import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://pfvdqlmivraggxzsbymv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmdmRxbG1pdnJhZ2d4enNieW12Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDYyOTExMSwiZXhwIjoyMDg2MjA1MTExfQ.-RKtZA5ImTRA4Rup2FgYLInkK8GboQ7NoGDGcQdleTM"
);

export async function POST(req: NextRequest) {
  try {
    const { code, userId } = await req.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Coupon code is required' }, { status: 400 });
    }

    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('code, discount_percent, active, user_id, first_booking_only, usage_limit')
      .eq('code', code.trim().toUpperCase())
      .eq('active', true);

    if (error || !coupons || coupons.length === 0) {
      return NextResponse.json({ error: 'Invalid coupon code' }, { status: 404 });
    }

    const coupon = coupons.find(c => c.user_id === userId) || coupons.find(c => !c.user_id);

    if (!coupon) {
      return NextResponse.json({ error: 'This coupon is not available for you' }, { status: 400 });
    }

    if (coupon.user_id && coupon.user_id !== userId) {
      return NextResponse.json({ error: 'This coupon is not available for you' }, { status: 400 });
    }

    // Check usage limit
    if (userId) {
      const { count: usageCount } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('coupon_code', coupon.code)
        .neq('status', 'Cancelled');

      if ((usageCount ?? 0) >= (coupon.usage_limit || 1)) {
        return NextResponse.json({ error: `You have already used this coupon ${usageCount} times` }, { status: 400 });
      }

      if (coupon.first_booking_only) {
        const { count: totalBookings } = await supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .neq('status', 'Cancelled');

        if ((totalBookings ?? 0) > 0) {
          return NextResponse.json({ error: 'This coupon is only valid for your first booking' }, { status: 400 });
        }
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

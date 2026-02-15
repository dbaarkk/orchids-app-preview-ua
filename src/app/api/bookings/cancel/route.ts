import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function POST(request: NextRequest) {
  try {
    const { bookingId, userId } = await request.json();

    if (!bookingId || !userId) {
      return NextResponse.json({ error: 'Booking ID and User ID are required' }, { status: 400 });
    }

    const adminClient = getAdminClient();

    // 1. Fetch booking
    const { data: booking, error: fetchErr } = await adminClient
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status === 'Cancelled') {
      return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 });
    }

    // 2. Perform refund if applicable
    if (booking.payment_method === 'wallet' && booking.payment_status === 'paid') {
      const { data: profile, error: profileErr } = await adminClient
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .single();

      if (profileErr) throw profileErr;

      const newBalance = (profile?.wallet_balance || 0) + (booking.total_amount || 0);

      // Update balance
      const { error: updateBalErr } = await adminClient
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', userId);

      if (updateBalErr) throw updateBalErr;

      // Insert transaction
      const { error: transErr } = await adminClient
        .from('wallet_transactions')
        .insert([{
          user_id: userId,
          amount: booking.total_amount,
          type: 'credit',
          description: `Refund for cancelled booking: ${booking.service_name}`,
          booking_id: booking.id
        }]);

      if (transErr) throw transErr;
    }

    // 3. Update booking status
    const { error: updateStatusErr } = await adminClient
      .from('bookings')
      .update({ status: 'Cancelled' })
      .eq('id', bookingId);

    if (updateStatusErr) throw updateStatusErr;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

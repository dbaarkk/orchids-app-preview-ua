import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/fcm';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');
    const userId = searchParams.get('userId');
    const adminClient = getAdminClient();

    if (resource === 'bookings') {
      const { data, error } = await adminClient
        .from('bookings')
        .select(`
          *,
          profiles:user_id (
            manual_location_link
          )
        `)
        .order('created_at', { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      // Flatten the profile data
      const flattened = data.map((b: any) => ({
        ...b,
        manual_location_link: b.profiles?.manual_location_link
      }));

      return NextResponse.json({ data: flattened });
    }

    if (resource === 'profiles') {
      const { data, error } = await adminClient
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }

    if (resource === 'services') {
      const { data, error } = await adminClient
        .from('service_prices')
        .select('*')
        .order('service_name');
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }

    if (resource === 'coupons') {
      const { data, error } = await adminClient
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }

    if (resource === 'user-detail' && userId) {
      const [profileRes, bookingsRes, transactionsRes] = await Promise.all([
        adminClient.from('profiles').select('*').eq('id', userId).single(),
        adminClient.from('bookings').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        adminClient.from('wallet_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);
      if (profileRes.error) return NextResponse.json({ error: profileRes.error.message }, { status: 500 });
      return NextResponse.json({
        profile: profileRes.data,
        bookings: bookingsRes.data || [],
        transactions: transactionsRes.data || [],
      });
    }

    if (resource === 'user-coupons' && userId) {
      const { data, error } = await adminClient
        .from('coupons')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }

    if (resource === 'app-config') {
      const { data, error } = await adminClient
        .from('app_config')
        .select('*');
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const config: Record<string, any> = {};
      data.forEach(item => { config[item.key] = item.value; });
      return NextResponse.json({ data: config });
    }

    if (resource === 'export-users') {
      const { data, error } = await adminClient
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      const headers = ['display_id', 'id', 'user_name', 'user_email', 'user_phone', 'wallet_balance', 'verified', 'blocked', 'created_at', 'address_line1', 'address_line2', 'city', 'state', 'pincode'];

      const csvRows = [];
      csvRows.push(headers.map(h => `"${h}"`).join(','));

      data.forEach((row: any) => {
        const values = [
          row.display_id || '',
          row.id,
          row.full_name || '',
          row.email || '',
          row.phone || '',
          row.wallet_balance || 0,
          row.verified ? 'Yes' : 'No',
          row.blocked ? 'Yes' : 'No',
          row.created_at,
          row.address_line1 || '',
          row.address_line2 || '',
          row.city || '',
          row.state || '',
          row.pincode || ''
        ];
        csvRows.push(values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
      });

      const csvContent = csvRows.join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="users_export.csv"',
        },
      });
    }

    return NextResponse.json({ error: 'Invalid resource' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, userId, password, amount, description, couponCode, couponDiscount, couponUserId } = body;

    const adminClient = getAdminClient();

    if (action === 'reset-password') {
      if (!userId || !password || password.length < 8) {
        return NextResponse.json({ error: 'User ID and password (min 8 chars) required' }, { status: 400 });
      }
      const { error } = await adminClient.auth.admin.updateUserById(userId, { password });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === 'block-user') {
      if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      const { error } = await adminClient.from('profiles').update({ blocked: true }).eq('id', userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === 'unblock-user') {
      if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      const { error } = await adminClient.from('profiles').update({ blocked: false }).eq('id', userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === 'verify-user') {
      if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      const { error } = await adminClient.from('profiles').update({ verified: true }).eq('id', userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === 'unverify-user') {
      if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });
      const { error } = await adminClient.from('profiles').update({ verified: false }).eq('id', userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === 'add-wallet-money') {
      if (!userId || !amount || amount <= 0) {
        return NextResponse.json({ error: 'User ID and valid amount required' }, { status: 400 });
      }
      const { data: profile, error: fetchErr } = await adminClient
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .single();
      if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 400 });

      const newBalance = (profile.wallet_balance || 0) + Number(amount);
      const { error: updateErr } = await adminClient
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', userId);
      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });

        await adminClient.from('wallet_transactions').insert([{
          user_id: userId,
          amount: Number(amount),
          type: 'credit',
          description: description || 'Added by admin',
        }]);

      return NextResponse.json({ success: true, newBalance });
    }

    if (action === 'create-coupon') {
      const { couponCode, couponDiscount, couponUserId, usageLimit } = body;
      if (!couponCode || !couponDiscount) {
        return NextResponse.json({ error: 'Code and discount required' }, { status: 400 });
      }
      const insertData: any = {
        code: couponCode.trim().toUpperCase(),
        discount_percent: Number(couponDiscount),
        active: true,
        usage_limit: usageLimit || 1
      };
      if (couponUserId) insertData.user_id = couponUserId;

      const { error } = await adminClient.from('coupons').insert([insertData]);
      if (error) {
        const msg = error.message.includes('duplicate') ? 'Coupon code already exists' : error.message;
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'toggle-coupon') {
      const { couponId, active } = body;
      const { error } = await adminClient.from('coupons').update({ active: !active }).eq('id', couponId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === 'delete-coupon') {
      const { couponId } = body;
      const { error } = await adminClient.from('coupons').delete().eq('id', couponId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === 'update-booking-status') {
      const { bookingId, status } = body;

      // Refund logic if cancelling
      if (status === 'Cancelled') {
        const { data: booking, error: fetchErr } = await adminClient
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .single();

        if (!fetchErr && booking && booking.status !== 'Cancelled') {
          if (booking.payment_method === 'wallet' && booking.payment_status === 'paid') {
            const { data: profile } = await adminClient
              .from('profiles')
              .select('wallet_balance')
              .eq('id', booking.user_id)
              .single();

            const newBalance = (profile?.wallet_balance || 0) + (booking.total_amount || 0);
            await adminClient.from('profiles').update({ wallet_balance: newBalance }).eq('id', booking.user_id);
            await adminClient.from('wallet_transactions').insert([{
              user_id: booking.user_id,
              amount: booking.total_amount,
              type: 'credit',
              description: `Refund for cancelled booking: ${booking.service_name}`,
              booking_id: booking.id
            }]);
          }
        }
      }

      const { error } = await adminClient.from('bookings').update({ status }).eq('id', bookingId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });

      // Trigger push notification if status is 'Confirmed'
      if (status === 'Confirmed') {
        const { data: booking } = await adminClient.from('bookings').select('user_id, service_name').eq('id', bookingId).single();
        if (booking) {
          const { data: tokens } = await adminClient.from('device_tokens').select('token').eq('user_id', booking.user_id);
          if (tokens && tokens.length > 0) {
            const tokenList = tokens.map(t => t.token).filter(Boolean);
            const failedTokens = await sendPushNotification(
              tokenList,
              'Booking Confirmed',
              'Hurray. Your booking is confirmed!',
              { booking_id: bookingId, type: 'booking_confirmed' }
            );

            if (failedTokens && failedTokens.length > 0) {
              await adminClient.from('device_tokens').delete().in('token', failedTokens);
            }
          }
        }
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'reschedule-booking') {
      const { bookingId, dateTime } = body;
      const { error } = await adminClient
        .from('bookings')
        .update({ status: 'Rescheduled', preferred_date_time: dateTime, rescheduled_by: 'admin' })
        .eq('id', bookingId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === 'update-service-price') {
      const { serviceId, prices } = body;
      const { error } = await adminClient
        .from('service_prices')
        .update({ ...prices, updated_at: new Date().toISOString() })
        .eq('service_id', serviceId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === 'send-push-notification') {
      const { title, content } = body;
      const { data: tokens, error: tokenErr } = await adminClient
        .from('device_tokens')
        .select('token');

      if (tokenErr) return NextResponse.json({ error: tokenErr.message }, { status: 400 });

      const tokenList = tokens?.map(t => t.token).filter(Boolean) || [];

      if (tokenList.length > 0) {
        const failedTokens = await sendPushNotification(tokenList, title, content, { type: 'admin_notification' });
        if (failedTokens && failedTokens.length > 0) {
          await adminClient.from('device_tokens').delete().in('token', failedTokens);
        }
      }

      return NextResponse.json({ success: true, deviceCount: tokenList.length });
    }

    if (action === 'update-app-config') {
      const { key, value } = body;
      const { error } = await adminClient
        .from('app_config')
        .upsert({ key, value, updated_at: new Date().toISOString() });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === 'update-user-manual-location') {
      const { userId, link } = body;
      const { error } = await adminClient
        .from('profiles')
        .update({ manual_location_link: link })
        .eq('id', userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

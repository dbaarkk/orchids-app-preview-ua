import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendBookingWhatsAppNotification } from '@/lib/twilio';

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  try {
    const bookingPayload = await request.json();

    // Insert booking using admin client to manage correctly
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .insert([bookingPayload])
      .select();

    if (error) {
      console.error('Database insertion error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const newBooking = data[0];

    // If a package was used, decrement its allowances
    if (bookingPayload.package_id) {
      const { data: pkgData } = await supabaseAdmin.from('user_packages').select('remaining_allowances').eq('id', bookingPayload.package_id).single();
      if (pkgData && pkgData.remaining_allowances) {
          const updatedAllowances = { ...pkgData.remaining_allowances };
          const serviceName = bookingPayload.service_name || bookingPayload.serviceName;
          const serviceId = bookingPayload.service_id;

          const keyToDeduct = serviceId && updatedAllowances[serviceId] ? serviceId : serviceName;

          if (keyToDeduct && updatedAllowances[keyToDeduct] && updatedAllowances[keyToDeduct] > 0) {
              updatedAllowances[keyToDeduct] -= 1;
              await supabaseAdmin.from('user_packages').update({ remaining_allowances: updatedAllowances }).eq('id', bookingPayload.package_id);
          }
      }
    }


    // Format data for WhatsApp notification based on what's saved
    const whatsappData = {
      name: newBooking.user_name || 'Customer',
      phone: newBooking.user_phone || 'N/A',
      service: newBooking.service_name || 'General Service',
      vehicle: `${newBooking.vehicle_make_model || ''} (${newBooking.vehicle_type || ''})`.trim() || 'N/A',
      date: newBooking.booking_date ? new Date(newBooking.booking_date).toLocaleDateString('en-IN') : 'N/A',
      time: newBooking.preferred_time || 'N/A',
      address: newBooking.address || 'N/A',
      payment: newBooking.payment_method || 'pay_later',
    };

    // Trigger WhatsApp notification asynchronously
    sendBookingWhatsAppNotification(whatsappData).catch(err => {
      console.error('Asynchronous WhatsApp notification failed:', err);
    });

    return NextResponse.json({ success: true, booking: newBooking });
  } catch (error: any) {
    console.error('Booking creation API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

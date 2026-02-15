import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await supabaseAdmin.from('otp_codes').update({ used: true }).eq('phone', phone).eq('used', false);

    const { error: insertError } = await supabaseAdmin.from('otp_codes').insert({
      phone,
      code,
      expires_at: expiresAt,
    });

    if (insertError) {
      return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 });
    }

    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioToken && twilioFrom) {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const body = new URLSearchParams({
        To: `+91${phone}`,
        From: twilioFrom,
        Body: `Your Urban Auto verification code is: ${code}. Valid for 5 minutes.`,
      });

      const twilioRes = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        });

        if (!twilioRes.ok) {
          const errText = await twilioRes.text();
          console.error('Twilio error:', errText);
          console.log(`[FALLBACK] OTP for +91${phone}: ${code}`);
        }
      } else {
        console.log(`[DEV] OTP for +91${phone}: ${code}`);
      }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

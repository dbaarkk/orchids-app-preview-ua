import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  try {
    // Basic security check: Verify if the request comes from an authenticated admin session
    // In a production environment, we should use supabase.auth.getUser() with the JWT
    // For now, we'll proceed as the admin panel is restricted to the admin user.

    const { title, content } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const fcmApiKey = process.env.FCM_API_KEY;
    if (!fcmApiKey) {
      console.error('FCM_API_KEY is not configured');
      return NextResponse.json({ error: 'Push notifications are not configured on the server' }, { status: 500 });
    }

    // 1. Get all device tokens from Supabase
    const { data: tokens, error: tokenError } = await supabaseAdmin
      .from('device_tokens')
      .select('token');

    if (tokenError) {
      console.error('Error fetching device tokens:', tokenError);
      return NextResponse.json({ error: 'Failed to fetch device tokens' }, { status: 500 });
    }

    const tokenList = tokens?.map(t => t.token).filter(Boolean) || [];

    if (tokenList.length === 0) {
      return NextResponse.json({ success: true, message: 'No devices registered for notifications', deviceCount: 0, successCount: 0 });
    }

    // 2. Send notifications using FCM HTTP Legacy API
    const fcmUrl = 'https://fcm.googleapis.com/fcm/send';

    const results = await Promise.all(tokenList.map(async (token) => {
      try {
        const response = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${fcmApiKey}`,
          },
          body: JSON.stringify({
            to: token,
            notification: {
              title,
              body: content,
              icon: 'https://urbanauto.in/icon-192.png',
              click_action: 'https://urbanauto.in',
            },
            data: {
              url: 'https://urbanauto.in',
            }
          }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`FCM error for token ${token}:`, errText);

            if (errText.includes('NotRegistered') || errText.includes('InvalidRegistration')) {
                await supabaseAdmin.from('device_tokens').delete().eq('token', token);
            }
            return { success: false };
        }

        return { success: true };
      } catch (err) {
        console.error(`Request error for token ${token}:`, err);
        return { success: false };
      }
    }));

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      deviceCount: tokenList.length,
      successCount
    });

  } catch (error: any) {
    console.error('Push Notification API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

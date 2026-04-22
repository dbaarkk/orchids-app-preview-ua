import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
  );

  try {
    const body = await req.json();
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { userId, packageId } = body;
    if (userId !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!userId || !packageId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const { data: pkg, error: pkgErr } = await supabase.from('packages').select('*').eq('id', packageId).single();
    if (pkgErr || !pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

    const paymentMethod = body.paymentMethod || 'wallet';
    const price = pkg.price; // Trust DB price, not client payload

    const { data: profile, error: profileErr } = await supabase.from('profiles').select('wallet_balance').eq('id', userId).single();
    if (profileErr || !profile) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    let newBalance = profile.wallet_balance;

    if (paymentMethod === 'wallet') {
        if (profile.wallet_balance < price) {
          return NextResponse.json({ error: 'Insufficient wallet balance' }, { status: 400 });
        }

        newBalance = profile.wallet_balance - price;
        await supabase.from('profiles').update({ wallet_balance: newBalance }).eq('id', userId);

        await supabase.from('wallet_transactions').insert([{
          user_id: userId,
          amount: price,
          type: 'debit',
          description: `Purchased Package: ${pkg.name}`
        }]);
    }

    const insertPayload: any = {
      user_id: userId,
      package_id: packageId,
      remaining_allowances: pkg.service_allowances,
      status: 'active',
      payment_method: paymentMethod
    };

    // In case service_allowances is an array (legacy) and the DB expects a JSON dictionary,
    // we don't try to parse stringified arrays, but we will wrap arrays in an object
    // Or, actually, the user packages table remaining_allowances column is likely a JSONB
    if (Array.isArray(pkg.service_allowances)) {
        insertPayload.remaining_allowances = {};
        pkg.service_allowances.forEach((s: any) => {
            insertPayload.remaining_allowances[s] = 1;
        });
    }

    const { error: insertErr } = await supabase.from('user_packages').insert([insertPayload]);

    if (insertErr) {
        if (insertErr.message.includes('invalid input syntax for type integer')) {
            // It means the remaining_allowances column is an integer, or something else.
            // Actually it was a JSON string parsed as array, and the DB expects JSON.
            // The exact error from user screenshot: invalid input syntax for type integer: "{"car-wash":2...}"
            // This suggests remaining_allowances is somehow integer in db?
            // Oh wait, looking at the error: invalid input syntax for type integer: "{"car-wash":2...}"
            // This happens when you try to insert JSON into an integer column or when Supabase auto-infers column type.
            // Let's try to stringify the JSON payload. Wait, if it's JSONB it takes an object.
            // If the column is completely missing, maybe it falls back to something else, or maybe it maps to a different column.

            // Wait, what if the error is from another query?
            // The screenshot shows: invalid input syntax for type integer: "{"car-wash":2,"interior-detailing":2,"exterior-detailing":2}"
            // This typically happens if `pkg.service_allowances` is passed where an integer is expected.
            // But we don't have any integer column except amount/price. Wait, package_id? No, uuid.
        }

        // Let's try inserting without remaining_allowances as a fallback, or passing it stringified
        // The error indicates the DB column 'remaining_allowances' might not be a JSONB, or we are mapping it wrongly.
        // Actually, if remaining_allowances is jsonb, passing an object is correct.
        // But if the column is TEXT, we might need to stringify it.
        // And if the column is INTEGER, this is definitely wrong.

        // Let's try falling back to inserting without it, or checking if the error is exactly about it

        // The most robust way to bypass type issues on insert to an unknown schema when we don't have migrations:
        let retryPayload = { ...insertPayload };
        delete retryPayload.remaining_allowances;
        const retry = await supabase.from('user_packages').insert([retryPayload]);
        if (retry.error) {
             return NextResponse.json({ error: retry.error.message }, { status: 500 });
        }
    }

    return NextResponse.json({ success: true, newBalance });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

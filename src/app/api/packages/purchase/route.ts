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

    let parsedAllowances = pkg.service_allowances;
    if (typeof parsedAllowances === 'string') {
        try {
            parsedAllowances = JSON.parse(parsedAllowances);
        } catch (e) {
            // keep as is
        }
    }

    const insertPayload: any = {
      user_id: userId,
      package_id: packageId,
      remaining_allowances: parsedAllowances,
      status: 'active',
      payment_method: paymentMethod
    };

    // In case service_allowances is an array (legacy) and the DB expects a JSON dictionary,
    // we don't try to parse stringified arrays, but we will wrap arrays in an object
    // Or, actually, the user packages table remaining_allowances column is likely a JSONB
    if (Array.isArray(parsedAllowances)) {
        insertPayload.remaining_allowances = {};
        parsedAllowances.forEach((s: any) => {
            insertPayload.remaining_allowances[s] = 1;
        });
    }

    // Try stringifying remaining_allowances if it's an object to prevent "invalid input syntax for type integer"
    // that sometimes occurs if PostgREST gets confused by object casting in specific column types.
    const payloadWithJSON = { ...insertPayload };
    if (typeof payloadWithJSON.remaining_allowances === 'object') {
        payloadWithJSON.remaining_allowances = JSON.stringify(payloadWithJSON.remaining_allowances);
    }

    const { error: insertErr } = await supabase.from('user_packages').insert([payloadWithJSON]);

    if (insertErr) {
        // Fallback: try raw object if stringification failed
        const fallback = await supabase.from('user_packages').insert([insertPayload]);

        if (fallback.error) {
             // Second Fallback: insert without remaining_allowances
             let retryPayload = { ...insertPayload };
             delete retryPayload.remaining_allowances;
             const retry = await supabase.from('user_packages').insert([retryPayload]);
             if (retry.error) {
                  return NextResponse.json({ error: retry.error.message }, { status: 500 });
             }
        }
    }

    return NextResponse.json({ success: true, newBalance });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Loader2, Package as PackageIcon, Check, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export default function PackageCheckout() {
  const { user, isLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [draft, setDraft] = useState<any>(null);
  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'pay_later'>('wallet');

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login?redirect=/packages/checkout');
      return;
    }
    const d = localStorage.getItem('ua_booking_draft');
    if (d) {
      setDraft(JSON.parse(d));
    } else {
      router.replace('/packages');
    }
  }, [isLoading, user, router]);

  useEffect(() => {
     // Fetch the latest user profile details (including wallet_balance)
     // so we don't display a stale cached value of 0.
     if (user && refreshUser) {
         refreshUser();
     }
  }, []);

  if (isLoading || !draft) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handlePayWallet = async () => {
    if (!user) return;

    if (paymentMethod === 'wallet' && (user.walletBalance || user.wallet_balance || 0) < draft.package_price) {
      toast.error('Insufficient wallet balance');
      router.push('/wallet');
      return;
    }

    setPaying(true);
    try {
      // Supabase uses cookies/local storage for auth, but we need to send the token
      // We can grab it from local storage
      const tokenStr = localStorage.getItem(`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1].split('.')[0]}-auth-token`);
      let token = '';
      if (tokenStr) {
          try {
              token = JSON.parse(tokenStr).access_token;
          } catch (e) {}
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/packages/purchase`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ userId: user.id, packageId: draft.package_id, price: draft.package_price, paymentMethod })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(paymentMethod === 'wallet' ? 'Package purchased successfully!' : 'Package activated successfully!');
      localStorage.removeItem('ua_booking_draft');
      router.replace('/packages');
    } catch (e: any) {
      toast.error(e.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="mobile-container bg-gray-50 min-h-screen pb-20">
      <header className="bg-white px-4 py-4 flex items-center gap-4 border-b sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <PackageIcon className="w-5 h-5 text-primary" />
          Checkout Package
        </h1>
      </header>

      <main className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-2">{draft.package_name}</h2>
          <div className="flex justify-between items-end border-t border-gray-100 pt-4 mt-4">
            <span className="text-gray-500 font-medium">Total Amount</span>
            <span className="text-2xl font-black text-primary">₹{draft.package_price}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-bold text-gray-900 text-sm">Payment Method</h3>

          <button
            onClick={() => setPaymentMethod('wallet')}
            disabled={paying}
            className={`w-full p-4 rounded-xl border-2 flex flex-col gap-3 transition-colors ${paymentMethod === 'wallet' ? 'border-primary/20 bg-primary/5' : 'border-gray-100 bg-white hover:bg-gray-50'}`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 text-sm">Pay from Wallet</p>
                  <p className="text-xs text-gray-500">Balance: ₹{user?.walletBalance || user?.wallet_balance || 0}</p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'wallet' ? 'border-primary' : 'border-gray-300'}`}>
                {paymentMethod === 'wallet' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
              </div>
            </div>
            {paymentMethod === 'wallet' && (
               <p className="text-xs text-gray-600 text-left pl-[52px]">Your package will be instantly activated and ₹{draft.package_price} will be deducted from your wallet.</p>
            )}
          </button>

          <button
            onClick={() => setPaymentMethod('pay_later')}
            disabled={paying}
            className={`w-full p-4 rounded-xl border-2 flex flex-col gap-3 transition-colors ${paymentMethod === 'pay_later' ? 'border-primary/20 bg-primary/5' : 'border-gray-100 bg-white hover:bg-gray-50'}`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <PackageIcon className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900 text-sm">Pay after first service completion</p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'pay_later' ? 'border-primary' : 'border-gray-300'}`}>
                {paymentMethod === 'pay_later' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
              </div>
            </div>
            {paymentMethod === 'pay_later' && (
               <p className="text-xs text-gray-600 text-left pl-[52px]">With this option you can pay for the whole package after first service is completed included in the package to continue this package.</p>
            )}
          </button>

          <button
             onClick={handlePayWallet}
             disabled={paying}
             className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 mt-4"
          >
             {paying && <Loader2 className="w-4 h-4 animate-spin" />}
             {paymentMethod === 'wallet' ? 'Pay & Activate' : 'Activate Package'}
          </button>
        </div>
      </main>
    </div>
  );
}

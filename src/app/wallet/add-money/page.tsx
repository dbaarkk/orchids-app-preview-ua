'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, Wallet, Phone, MessageCircle, Loader2 } from 'lucide-react';

export default function AddMoneyPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading || !user) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const balance = user.walletBalance ?? 0;

  return (
    <div className="mobile-container bg-white min-h-screen">
      <header className="bg-white px-4 py-4 flex items-center gap-4 border-b sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5 text-gray-900" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Add Money</h1>
      </header>

      <div className="px-4 py-6">
        <div className="bg-gray-50 rounded-2xl p-5 mb-4 flex items-center gap-4 border border-gray-200">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Current Balance</p>
            <p className="text-2xl font-bold text-gray-900">₹{balance.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Wallet Recharge</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            Currently, wallet recharges are available exclusively at our workstation. 
            Please visit Urban Auto to add funds to your wallet, or contact us for assistance.
          </p>

          <div className="space-y-3">
            <a
              href="tel:+917000000000"
              className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call Us
            </a>
            <a
              href="https://wa.me/917000000000?text=Hi%2C%20I%20want%20to%20recharge%20my%20UA%20Wallet"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-green-600 text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

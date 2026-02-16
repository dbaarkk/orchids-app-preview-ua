'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, Wallet, Plus, ArrowDownLeft, ArrowUpRight, Loader2, Zap, CheckCircle, Banknote } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface WalletTransaction {
  id: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  created_at: string;
}

type TxFilter = 'all' | 'debit' | 'credit' | 'refunds';

export default function WalletPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [filter, setFilter] = useState<TxFilter>('all');

  const fetchTransactions = useCallback(async (userId: string) => {
    setLoadingTx(true);
    const { data } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    setTransactions(data || []);
    setLoadingTx(false);
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }
    if (user) {
      fetchTransactions(user.id);
    }
  }, [isLoading, user?.id]);

  if (isLoading && !user) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const filteredTx = transactions.filter((tx) => {
    if (filter === 'all') return true;
    if (filter === 'credit') return tx.type === 'credit';
    if (filter === 'debit') return tx.type === 'debit';
    if (filter === 'refunds') return tx.type === 'credit' && tx.description.toLowerCase().includes('refund');
    return true;
  });

  const currentBalance = user.walletBalance ?? 0;
  const hasBalance = currentBalance > 0 || transactions.length > 0;

  if (!hasBalance && !loadingTx) {
    return (
      <div className="mobile-container bg-white min-h-screen">
        <header className="px-4 pt-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 -ml-2">
              <ArrowLeft className="w-5 h-5 text-gray-900" />
            </button>
          </div>
        </header>

        <div className="px-6 pt-8">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h1 className="text-2xl font-black leading-tight text-gray-900">Urban Auto</h1>
              <h1 className="text-3xl font-black leading-tight text-gray-900">Wallet</h1>
              <p className="text-sm text-gray-500 mt-2">Faster checkouts and<br />hassle-free refunds</p>
            </div>
            <div className="w-20 h-20 relative">
              <div className="w-16 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg transform rotate-[-10deg] absolute top-2 right-0 shadow-lg">
                <div className="absolute bottom-2 left-2 right-2 flex gap-0.5">
                  <div className="h-1 flex-1 bg-yellow-400 rounded-full" />
                  <div className="h-1 flex-1 bg-red-400 rounded-full" />
                  <div className="h-1 flex-1 bg-blue-400 rounded-full" />
                </div>
                <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-300 rounded-full" />
              </div>
              <div className="w-6 h-4 bg-green-500 rounded-sm absolute bottom-0 right-0 transform rotate-[15deg]" />
            </div>
          </div>

          <div className="mt-10 space-y-0">
            <div className="flex items-center gap-4 py-5 border-b border-gray-200">
              <div className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center">
                <Zap className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Single tap payments</p>
                <p className="text-xs text-gray-500">Seamless payments without the wait for OTPs</p>
              </div>
            </div>
            <div className="flex items-center gap-4 py-5 border-b border-gray-200">
              <div className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Zero failures</p>
                <p className="text-xs text-gray-500">Zero payment failures ensure you never miss a booking</p>
              </div>
            </div>
            <div className="flex items-center gap-4 py-5">
              <div className="w-11 h-11 bg-gray-100 rounded-full flex items-center justify-center">
                <Banknote className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Instant refunds</p>
                <p className="text-xs text-gray-500">Get your money back instantly</p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-lg font-bold text-primary">
              Enjoy seamless payments
            </p>
          </div>

          <button
            onClick={() => router.push('/wallet/add-money')}
            className="w-full mt-6 bg-primary text-white py-4 rounded-2xl font-bold text-sm"
          >
            Add Money
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container bg-white min-h-screen">
      <header className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-900" />
          </button>
        </div>
      </header>

      <div className="flex flex-col items-center pt-4 pb-6">
        <div className="w-16 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg mb-4 relative">
          <div className="absolute bottom-1.5 left-1.5 right-1.5 flex gap-0.5">
            <div className="h-0.5 flex-1 bg-yellow-400 rounded-full" />
            <div className="h-0.5 flex-1 bg-red-400 rounded-full" />
            <div className="h-0.5 flex-1 bg-blue-400 rounded-full" />
          </div>
          <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-300 rounded-full" />
          <div className="w-5 h-3 bg-green-500 rounded-sm absolute -bottom-1 -right-2 transform rotate-[15deg]" />
        </div>
        <p className="text-3xl font-black text-gray-900">
          ₹{currentBalance.toLocaleString('en-IN')}
        </p>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1">UA Wallet Balance</p>
      </div>

      <div className="px-4 mb-6">
        <button
          onClick={() => router.push('/wallet/add-money')}
          className="w-full bg-primary text-white py-3.5 rounded-full font-semibold text-sm"
        >
          Add money
        </button>
      </div>

      <div className="px-4">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Transaction history</h3>

        <div className="flex gap-2 mb-4">
          {(['all', 'debit', 'credit', 'refunds'] as TxFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === f
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-gray-500 border-gray-300'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loadingTx ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : filteredTx.length === 0 ? (
          <div className="rounded-2xl p-8 text-center border border-gray-200">
            <Wallet className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No transactions</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTx.map((tx) => (
              <div
                key={tx.id}
                className="bg-gray-50 rounded-xl p-4 flex items-center gap-3"
              >
                <div className="w-9 h-9 bg-gray-200 rounded-lg flex items-center justify-center">
                  {tx.type === 'credit' ? (
                    <ArrowDownLeft className="w-4 h-4 text-green-600" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                  <p className="text-[10px] text-gray-500">
                    on {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, at {new Date(tx.created_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </p>
                </div>
                <p className={`text-sm font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.type === 'credit' ? '+' : '-'}₹{Math.abs(tx.amount).toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="h-10" />
    </div>
  );
}

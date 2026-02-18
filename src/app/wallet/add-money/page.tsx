'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, Wallet, Phone, MessageCircle, Loader2, QrCode, Copy, Check, MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function AddMoneyPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [config, setConfig] = useState<any>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/admin?resource=app-config')
      .then(res => res.json())
      .then(data => setConfig(data.data))
      .catch(() => {});
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('UPI ID Copied');
    setTimeout(() => setCopied(false), 2000);
  };

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

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Scan & Pay</h2>
            <p className="text-xs text-gray-500">Scan QR code to pay via any UPI app</p>
          </div>

          {config?.payment_config?.upi_id && (
            <div className="mb-4 text-center">
              <p className="text-sm font-bold text-primary mb-1">{config.payment_config.upi_id}</p>
              <button
                onClick={() => handleCopy(config.payment_config.upi_id)}
                className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-center gap-1 mx-auto hover:text-primary transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Click to copy UPI ID'}
              </button>
            </div>
          )}

          <div className="relative aspect-square max-w-[240px] mx-auto mb-8 bg-white rounded-2xl border border-gray-100 flex items-center justify-center overflow-hidden shadow-inner">
            {config?.payment_config?.qr_code_url ? (
              <img
                key={config.payment_config.qr_code_url}
                src={config.payment_config.qr_code_url}
                alt="Payment QR"
                className="w-full h-full object-contain p-4"
              />
            ) : (
              <div className="text-center p-8">
                <QrCode className="w-16 h-16 text-gray-200 mx-auto mb-2" />
                <p className="text-[10px] text-gray-400 font-medium">QR Code not available</p>
              </div>
            )}
          </div>

          <div className="mb-6 px-4">
            <p className="text-xs font-medium text-gray-500 text-center leading-relaxed">
              Share screenshot with us after paying to update your wallet balance
            </p>
          </div>

          <button
            onClick={() => setShowShareModal(true)}
            className="w-full bg-primary text-white py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
          >
            <MessageSquare className="w-5 h-5" />
            Share screenshot
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white rounded-t-[32px] w-full max-w-[430px] p-6 pb-12"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Contact Urban Auto</h3>
              <p className="text-sm text-gray-500 mb-8">Share your payment screenshot with us to get your balance updated instantly.</p>

              <div className="grid grid-cols-2 gap-4">
                <a
                  href="tel:+918889822220"
                  className="flex flex-col items-center gap-3 p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm font-bold text-gray-900">Phone Call</span>
                </a>
                <a
                  href={`https://wa.me/918889822220?text=${encodeURIComponent(`Hi, I've made a payment for my UA Wallet. Here is the screenshot. My user id is ---${user.id}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-3 p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="text-sm font-bold text-gray-900">WhatsApp</span>
                </a>
              </div>

              <button
                onClick={() => setShowShareModal(false)}
                className="w-full mt-6 py-4 text-gray-400 font-semibold text-sm"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useNativeNotifications } from '@/hooks/useNativeNotifications';
import { ArrowLeft, User, Mail, Phone, MapPin, LogOut, ChevronRight, HelpCircle, Info, KeyRound, Eye, EyeOff, X, Loader2, Wallet, Shield, Trash2, Lock, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { getAssetPath } from '@/lib/utils';

import NotificationModal from '@/components/NotificationModal';

function NotificationToggle() {
  const { registerNotifications, status } = useNativeNotifications();
  const [showModal, setShowModal] = useState(false);

  if (status === 'granted') return null;

  const handleEnable = async () => {
    // Preserve user gesture by calling register first
    await registerNotifications();
    setShowModal(false);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full flex items-center gap-3 p-4 hover:bg-primary/5 transition-colors"
      >
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-medium text-gray-900">Enable Notifications</span>
          <p className="text-[10px] text-gray-500">Stay updated with your bookings</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </button>

      <NotificationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onEnable={handleEnable}
      />
    </>
  );
}

export default function ProfilePage() {
  const { user, isLoading, logout, bookings, updatePin, refreshUser } = useAuth();
  const { registerNotifications } = useNativeNotifications();
  const router = useRouter();
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinStep, setPinStep] = useState<'otp' | 'reset'>('otp');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (!isLoading && !user) {
      router.replace('/login');
        }
      }, [isLoading, user?.id]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  if (isLoading || !user) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    router.replace('/login');
  };

  const openPinModal = async () => {
    setShowPinModal(true);
    setPinStep('otp');
    setOtp(['', '', '', '', '', '']);
    setNewPin('');
    setConfirmNewPin('');

    if (user.phone) {
      setOtpSending(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/send-otp`,  {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: user.phone }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        toast.success('OTP sent to +91' + user.phone);
        setResendTimer(30);
        setTimeout(() => otpRefs.current[0]?.focus(), 200);
      } catch (err: any) {
        toast.error(err.message || 'Failed to send OTP');
      } finally {
        setOtpSending(false);
      }
    }
  };

  const resendOtp = async () => {
    setOtpSending(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/send-otp`,  {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: user.phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('OTP sent to +91' + user.phone);
      setResendTimer(30);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setOtpSending(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    setOtpVerifying(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/verify-otp`,  {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: user.phone, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('OTP verified!');
      setPinStep('reset');
    } catch (err: any) {
      toast.error(err.message || 'Invalid or expired OTP');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handlePinReset = async () => {
    if (!newPin || !/^\d{4}$/.test(newPin)) {
      toast.error('Pin must be exactly 4 digits');
      return;
    }
    if (newPin !== confirmNewPin) {
      toast.error('Pins do not match');
      return;
    }
    setPinLoading(true);
    const result = await updatePin(newPin);
    if (result.success) {
      toast.success('Pin updated successfully');
      setShowPinModal(false);
      setNewPin('');
      setConfirmNewPin('');
    } else {
      toast.error(result.error || 'Failed to update Pin');
    }
    setPinLoading(false);
  };

      const walletBalance = user.walletBalance ?? 0;

  return (
    <div className="mobile-container bg-gray-50 min-h-screen safe-bottom">
      <header className="bg-primary px-4 pt-4 pb-20 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/home')} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-bold text-white">Profile</h1>
        </div>
      </header>

      <div className="px-4 -mt-14">
          {/* User Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">{user.name}</h2>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Wallet</p>
                  <p className="text-sm font-medium text-gray-900">₹{walletBalance.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm font-medium text-gray-900">+91 {user.phone}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Payments Section - UA Wallet */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-2xl shadow-md overflow-hidden mt-4"
          >
            <div className="p-4 pb-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Payments</h3>
            </div>
            <button
              onClick={() => router.push('/wallet')}
              className="w-full flex items-center gap-3 p-4 pt-0 hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <span className="text-sm font-medium text-gray-900">UA Wallet</span>
                <p className="text-xs text-gray-500">Balance: ₹{walletBalance.toLocaleString('en-IN')}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </motion.div>

        {/* Manage Section */}
        <div className="mt-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Manage</h3>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => toast.info('Profile editing coming soon')}
              className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <span className="flex-1 text-left text-sm font-medium text-gray-900">Edit Profile</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={openPinModal}
              className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-primary" />
              </div>
              <span className="flex-1 text-left text-sm font-medium text-gray-900">Reset Pin</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-4 hover:bg-red-50 transition-colors"
            >
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <LogOut className="w-5 h-5 text-red-600" />
              </div>
              <span className="flex-1 text-left text-sm font-medium text-red-600">Logout</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={() => router.push('/profile/delete-account')}
              className="w-full flex items-center gap-3 p-4 hover:bg-red-50 transition-colors border-b border-gray-100"
            >
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <span className="flex-1 text-left text-sm font-medium text-red-600">Delete Account</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <NotificationToggle />
          </div>
        </div>

        {/* Support Section */}
        <div className="mt-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Support</h3>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => router.push('/contact')}
              className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-gray-600" />
              </div>
              <span className="flex-1 text-left text-sm font-medium text-gray-900">Contact</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={() => router.push('/about')}
              className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Info className="w-5 h-5 text-gray-600" />
              </div>
              <span className="flex-1 text-left text-sm font-medium text-gray-900">About Us</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={() => router.push('/privacy-policy')}
              className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-gray-600" />
              </div>
              <span className="flex-1 text-left text-sm font-medium text-gray-900">Privacy Policy</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Image
            src={getAssetPath('/urban-auto-logo.jpg')}
            alt="Urban Auto"
            width={40}
            height={40}
            className="rounded-lg mx-auto mb-2"
            unoptimized
          />
          <p className="text-xs text-gray-400">Urban Auto v1.0.0</p>
        </div>

        <div className="h-6" />
      </div>

      <AnimatePresence>
        {showPinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowPinModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Reset Pin</h3>
                <button onClick={() => setShowPinModal(false)} className="p-1">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {pinStep === 'otp' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Enter the 6-digit OTP sent to <span className="font-semibold text-gray-700">+91 {user.phone}</span>
                  </p>

                  <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="tel"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="w-10 h-12 text-center text-lg font-bold border-2 border-gray-200 rounded-xl bg-gray-50 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleVerifyOtp}
                    disabled={otpVerifying || otp.join('').length !== 6}
                    className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {otpVerifying && <Loader2 className="w-4 h-4 animate-spin" />}
                    {otpVerifying ? 'Verifying...' : 'Verify OTP'}
                  </button>

                  <div className="text-center">
                    {resendTimer > 0 ? (
                      <p className="text-xs text-gray-400">Resend OTP in {resendTimer}s</p>
                    ) : (
                      <button
                        onClick={resendOtp}
                        disabled={otpSending}
                        className="text-xs text-primary font-semibold hover:underline disabled:opacity-50"
                      >
                        {otpSending ? 'Sending...' : 'Resend OTP'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {pinStep === 'reset' && (
                <div className="space-y-4">
                  <div className="bg-green-50 rounded-xl px-3 py-2 flex items-center gap-2">
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-xs text-green-700 font-medium">OTP Verified</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">New Pin</label>
                    <div className="relative">
                      <input
                        type={showNewPin ? 'text' : 'password'}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="Enter 4-digit Pin"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPin(!showNewPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showNewPin ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1.5 block">Confirm Pin</label>
                    <input
                      type={showNewPin ? 'text' : 'password'}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={confirmNewPin}
                      onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="Re-enter new Pin"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                    />
                  </div>
                  <button
                    onClick={handlePinReset}
                    disabled={pinLoading || newPin.length !== 4 || confirmNewPin.length !== 4}
                    className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {pinLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {pinLoading ? 'Updating...' : 'Update Pin'}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

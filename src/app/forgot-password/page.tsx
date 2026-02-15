'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Lock, Eye, EyeOff, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { getAssetPath } from '@/lib/utils';

type Step = 'phone' | 'otp' | 'reset' | 'success';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSendOtp = async () => {
    setError('');
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError('Enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      const checkRes = await fetch('/api/auth/check-exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '', phone }),
      });
      const checkData = await checkRes.json();

      if (checkData.available) {
        setError('No account found with this phone number');
        setLoading(false);
        return;
      }

      if (checkData.error && !checkData.error.includes('Number')) {
        setError('No account found with this phone number');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to send OTP');
        setLoading(false);
        return;
      }

      setStep('otp');
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
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
    setError('');
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid OTP');
        setLoading(false);
        return;
      }

      setStep('reset');
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to reset password');
        setLoading(false);
        return;
      }

      setEmail(data.email || '');
      setStep('success');
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-container bg-white min-h-screen flex flex-col px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/login" className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Reset Password</h1>
      </div>

      <div className="flex flex-col items-center mb-8">
        <div className="relative w-[80px] h-[80px] flex items-center justify-center">
          <Image
            src={getAssetPath('/urban-auto-logo.jpg')}
            alt="Urban Auto"
            width={80}
            height={80}
            className="rounded-xl shadow-md object-cover"
            priority
            unoptimized
          />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mt-4">
          URBAN <span className="text-primary">AUTO</span>
        </h2>
      </div>

      {step === 'phone' && (
        <div className="space-y-5">
          <div className="bg-gray-50 rounded-2xl p-5 text-center">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Phone className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm text-gray-500">Enter your registered phone number to receive a verification OTP</p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Phone Number</label>
            <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              <span className="text-gray-400 text-sm mr-2">+91</span>
              <input
                type="tel"
                maxLength={10}
                placeholder="Enter phone number"
                value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '')); setError(''); }}
                className="flex-1 text-sm text-gray-900 outline-none bg-transparent"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-600 text-xs font-medium">{error}</p>
            </div>
          )}

          <button
            onClick={handleSendOtp}
            disabled={loading || phone.length !== 10}
            className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all"
          >
            {loading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </div>
      )}

      {step === 'otp' && (
        <div className="space-y-5">
          <div className="bg-gray-50 rounded-2xl p-5 text-center">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <p className="text-sm text-gray-500">Enter the 6-digit code sent to</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">+91 {phone}</p>
          </div>

          <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { otpRefs.current[i] = el; }}
                type="tel"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                className="w-11 h-12 text-center text-lg font-bold border border-gray-200 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
              />
            ))}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-600 text-xs font-medium">{error}</p>
            </div>
          )}

          <button
            onClick={handleVerifyOtp}
            disabled={loading || otp.join('').length !== 6}
            className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>

          <button
            onClick={() => { setOtp(['', '', '', '', '', '']); setError(''); handleSendOtp(); }}
            disabled={loading}
            className="w-full text-primary text-sm font-medium disabled:opacity-50"
          >
            Resend OTP
          </button>
        </div>
      )}

      {step === 'reset' && (
        <div className="space-y-5">
          <div className="bg-green-50 rounded-2xl p-5 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Lock className="w-7 h-7 text-green-600" />
            </div>
            <p className="text-sm text-green-700 font-medium">Phone verified! Set your new password</p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">New Password</label>
            <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                className="flex-1 text-sm text-gray-900 outline-none bg-transparent"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 ml-2">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Confirm Password</label>
            <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              <input
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                className="flex-1 text-sm text-gray-900 outline-none bg-transparent"
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-gray-400 ml-2">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-red-600 text-xs font-medium">{error}</p>
            </div>
          )}

          <button
            onClick={handleResetPassword}
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold text-sm disabled:opacity-50 transition-all"
          >
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      )}

      {step === 'success' && (
        <div className="space-y-5">
          <div className="bg-green-50 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Password Reset Successful!</h3>
            <p className="text-sm text-gray-500">
              Your password has been updated. You can now login with your new password.
            </p>
            {email && (
              <p className="text-xs text-gray-400 mt-2">Account: {email}</p>
            )}
          </div>

          <button
            onClick={() => router.push('/login')}
            className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold text-sm transition-all"
          >
            Go to Login
          </button>
        </div>
      )}

      {step !== 'success' && (
        <p className="text-center text-sm text-gray-500 mt-8">
          Remember your password?{' '}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Login
          </Link>
        </p>
      )}
    </div>
  );
}

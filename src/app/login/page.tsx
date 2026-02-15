'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { getAssetPath } from '@/lib/utils';

type LoginMode = 'email' | 'phone';

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [phonePassword, setPhonePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [redirecting, setRedirecting] = useState(false);

  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { login, loginWithPhone, user, isAdmin, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && !redirecting) {
      setRedirecting(true);
      router.replace(isAdmin ? '/admin' : '/home');
    }
  }, [isLoading, user, isAdmin, redirecting, router]);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  if (isLoading || redirecting) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen bg-white">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const validateEmail = () => {
    const newErrors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) newErrors.email = 'Email is required';
    else if (!emailRegex.test(email)) newErrors.email = 'Please enter a valid email';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePhone = () => {
    const newErrors: Record<string, string> = {};
    if (!phone) newErrors.phone = 'Phone number is required';
    else if (!/^[6-9]\d{9}$/.test(phone)) newErrors.phone = 'Please enter a valid 10-digit phone number';
    if (!otpMode && !phonePassword) newErrors.phonePassword = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail()) return;

    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      setRedirecting(true);
      toast.success('Login successful!');
      const dest = result.isAdmin ? '/admin' : '/home';
      router.replace(dest);
      setTimeout(() => router.replace(dest), 100);
    } else {
      toast.error(result.error || 'Login failed');
      setLoading(false);
    }
  };

  const handlePhonePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/phone-password-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password: phonePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const result = await login(data.email, phonePassword);
      if (result.success) {
        setRedirecting(true);
        toast.success('Login successful!');
        const dest = result.isAdmin ? '/admin' : '/home';
        router.replace(dest);
        setTimeout(() => router.replace(dest), 100);
      } else {
        toast.error(result.error || 'Invalid credentials');
        setLoading(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    setOtpSending(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('OTP sent to +91' + phone);
      setResendTimer(30);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
      throw err;
    } finally {
      setOtpSending(false);
    }
  };

  const handleLoginWithOtp = async () => {
    const newErrors: Record<string, string> = {};
    if (!phone) newErrors.phone = 'Phone number is required';
    else if (!/^[6-9]\d{9}$/.test(phone)) newErrors.phone = 'Please enter a valid 10-digit phone number';
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

    setOtpSending(true);
    try {
      const checkRes = await fetch('/api/auth/check-exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const checkData = await checkRes.json();
      if (checkRes.ok && checkData.available) {
        toast.error('No account found with this phone number. Please sign up first.');
        setOtpSending(false);
        return;
      }

      await sendOtp();
      setOtpMode(true);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch {
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
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
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
      const verifyRes = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error);

      setLoading(true);
      const result = await loginWithPhone(phone);
      if (result.success) {
        setRedirecting(true);
        toast.success('Login successful!');
        const dest = result.isAdmin ? '/admin' : '/home';
        router.replace(dest);
        setTimeout(() => router.replace(dest), 100);
      } else {
        toast.error(result.error || 'No account found with this phone number');
        setLoading(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'OTP verification failed');
    } finally {
      setOtpVerifying(false);
    }
  };

  if (otpMode) {
    return (
      <div className="mobile-container bg-white min-h-screen flex flex-col px-6 py-8">
        <div className="flex flex-col items-center mb-10">
          <div className="relative w-[90px] h-[90px] flex items-center justify-center">
            <Image
              src={getAssetPath('/urban-auto-logo.jpg')}
              alt="Urban Auto"
              width={90}
              height={90}
              className="rounded-xl shadow-md object-cover"
              priority
              unoptimized
            />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mt-4">
            URBAN <span className="text-primary">AUTO</span>
          </h1>
        </div>

        <button
          onClick={() => { setOtpMode(false); setOtp(['', '', '', '', '', '']); }}
          className="flex items-center gap-1 text-sm text-gray-500 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-1">Verify Phone</h2>
        <p className="text-gray-500 text-sm mb-8">
          Enter the 6-digit code sent to <span className="font-semibold text-gray-700">+91 {phone}</span>
        </p>

        <div className="flex gap-2 justify-center mb-6" onPaste={handleOtpPaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)}
              className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl bg-gray-50 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          ))}
        </div>

        <button
          onClick={handleVerifyOtp}
          disabled={otpVerifying || loading || otp.join('').length !== 6}
          className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {(otpVerifying || loading) && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Logging in...' : otpVerifying ? 'Verifying...' : 'Verify & Login'}
        </button>

        <div className="text-center mt-4">
          {resendTimer > 0 ? (
            <p className="text-sm text-gray-400">Resend OTP in {resendTimer}s</p>
          ) : (
            <button
              onClick={sendOtp}
              disabled={otpSending}
              className="text-sm text-primary font-semibold hover:underline disabled:opacity-50"
            >
              {otpSending ? 'Sending...' : 'Resend OTP'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container bg-white min-h-screen flex flex-col px-6 py-8">
      <div className="flex flex-col items-center mb-10">
        <div className="relative w-[90px] h-[90px] flex items-center justify-center">
          <Image
            src={getAssetPath('/urban-auto-logo.jpg')}
            alt="Urban Auto"
            width={90}
            height={90}
            className="rounded-xl shadow-md object-cover"
            priority
            unoptimized
          />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mt-4">
          URBAN <span className="text-primary">AUTO</span>
        </h1>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome Back</h2>
      <p className="text-gray-500 text-sm mb-6">Login to your Urban Auto account</p>

      <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => { setMode('email'); setErrors({}); }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'email' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          Email
        </button>
        <button
          onClick={() => { setMode('phone'); setErrors({}); }}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === 'phone' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
        >
          Phone
        </button>
      </div>

      {mode === 'email' ? (
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-5">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className={`w-full px-4 py-3.5 rounded-xl border ${errors.email ? 'border-red-400' : 'border-gray-200'} bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm`}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={`w-full px-4 py-3.5 rounded-xl border ${errors.password ? 'border-red-400' : 'border-gray-200'} bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          <div className="flex justify-end -mt-1">
            <Link href="/forgot-password" className="text-xs text-primary font-medium hover:underline">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold text-sm mt-2 hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      ) : (
        <form onSubmit={handlePhonePasswordSubmit} className="flex flex-col gap-5">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone Number</label>
            <div className={`flex items-center border rounded-xl px-4 py-3.5 bg-gray-50 focus-within:bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all ${errors.phone ? 'border-red-400' : 'border-gray-200'}`}>
              <span className="text-gray-400 text-sm mr-2">+91</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter 10-digit phone number"
                className="flex-1 outline-none text-sm bg-transparent"
              />
            </div>
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={phonePassword}
                onChange={(e) => setPhonePassword(e.target.value)}
                placeholder="Enter your password"
                className={`w-full px-4 py-3.5 rounded-xl border ${errors.phonePassword ? 'border-red-400' : 'border-gray-200'} bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.phonePassword && <p className="text-red-500 text-xs mt-1">{errors.phonePassword}</p>}
          </div>

          <div className="flex justify-between -mt-1">
            <button
              type="button"
              onClick={handleLoginWithOtp}
              disabled={otpSending}
              className="text-xs text-primary font-medium hover:underline disabled:opacity-50 flex items-center gap-1"
            >
              {otpSending && <Loader2 className="w-3 h-3 animate-spin" />}
              Login with OTP
            </button>
            <Link href="/forgot-password" className="text-xs text-primary font-medium hover:underline">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold text-sm mt-2 hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-gray-500 mt-8">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-primary font-semibold hover:underline">
          Sign Up
        </Link>
      </p>
    </div>
  );
}

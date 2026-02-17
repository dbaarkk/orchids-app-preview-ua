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
  const [identifier, setIdentifier] = useState(''); // Email or Phone
  const [password, setPassword] = useState('');
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

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!identifier.trim()) newErrors.identifier = 'Email or phone is required';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const isEmail = identifier.includes('@');
      let finalEmail = identifier;
      let finalPassword = password;

      if (!isEmail) {
        // Handle phone login with password
        const phone = identifier.replace(/\D/g, '');
        if (phone.length !== 10) {
          toast.error('Please enter a valid 10-digit phone number or email');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/auth/phone-password-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        finalEmail = data.email;
      }

      const result = await login(finalEmail, finalPassword);
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

  const sendOtp = async (phoneNum: string) => {
    setOtpSending(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNum }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('OTP sent to +91' + phoneNum);
      setResendTimer(30);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
      throw err;
    } finally {
      setOtpSending(false);
    }
  };

  const handleLoginWithOtp = async () => {
    const phone = identifier.replace(/\D/g, '');
    if (phone.length !== 10) {
      toast.error('Please enter your 10-digit phone number first');
      return;
    }

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

      await sendOtp(phone);
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
    const phone = identifier.replace(/\D/g, '');
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
              onClick={() => sendOtp(phone)}
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

      <h2 className="text-2xl font-bold text-gray-900 mb-1 text-center">Welcome Back</h2>
      <p className="text-gray-500 text-sm mb-8 text-center">Login to your Urban Auto account</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <div>
  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Enter your email or phone</label>
  <input
    type="text"
    value={identifier}
    onChange={(e) => setIdentifier(e.target.value)}
    placeholder="Enter your email or phone"
    className={`w-full px-4 py-4 rounded-xl border ${errors.identifier ? 'border-red-400' : 'border-gray-200'} bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm font-medium placeholder:text-gray-400`}
  />
  {errors.identifier && <p className="text-red-500 text-xs mt-1">{errors.identifier}</p>}
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

        <div className="flex justify-between items-center -mt-1">
          <button
            type="button"
            onClick={handleLoginWithOtp}
            disabled={otpSending}
            className="text-xs text-primary font-semibold hover:underline disabled:opacity-50 flex items-center gap-1.5"
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
          className="w-full bg-primary text-white py-4 rounded-xl font-bold text-sm mt-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-60 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-8">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-primary font-semibold hover:underline">
          Sign Up
        </Link>
      </p>
    </div>
  );
}

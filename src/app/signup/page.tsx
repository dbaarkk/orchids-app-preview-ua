'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { getAssetPath } from '@/lib/utils';
import Carousel, { CarouselItem } from '@/components/Carousel';

type Step = 'phone' | 'otp' | 'details';

export default function SignupPage() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [redirecting, setRedirecting] = useState(false);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const { signup, user, isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const [carouselImages, setCarouselImages] = useState<string[]>([]);

  const [currentSlide, setCurrentSlide] = useState(0);
  useEffect(() => {
    if (carouselImages.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % carouselImages.length);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [carouselImages]);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.data?.signup_carousel?.images) {
          setCarouselImages(data.data.signup_carousel.images);
        }
      })
      .catch(() => {});
  }, []);

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

  const carouselItems: CarouselItem[] = useMemo(() => {
    return carouselImages.map((img, i) => ({
      id: i,
      image: img
    }));
  }, [carouselImages]);

  if (isLoading || redirecting) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen bg-white">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const validatePhone = () => {
    const newErrors: Record<string, string> = {};
    if (!phone) newErrors.phone = 'Phone number is required';
    else if (!/^[6-9]\d{9}$/.test(phone)) newErrors.phone = 'Please enter a valid 10-digit phone number';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDetails = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Full name is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com', 'rediffmail.com', 'zoho.com'];
    if (!email) newErrors.email = 'Email is required';
    else if (!emailRegex.test(email)) newErrors.email = 'Please enter a valid email';
    else {
      const domain = email.split('@')[1]?.toLowerCase();
      if (!domain || !allowedDomains.includes(domain)) newErrors.email = 'Please use a valid email (e.g. @gmail.com)';
    }
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    else if (!/\d/.test(password)) newErrors.password = 'Password must contain at least 1 number';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePhone()) return;

    setOtpSending(true);
    try {
      const checkRes = await fetch('/api/auth/check-exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const checkData = await checkRes.json();
      if (!checkRes.ok && checkData.error?.includes('already registered')) {
        toast.error('Number is already registered');
        setOtpSending(false);
        return;
      }

      await sendOtp();
      setStep('otp');
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

      toast.success('Phone verified!');
      setStep('details');
    } catch (err: any) {
      toast.error(err.message || 'OTP verification failed');
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDetails()) return;

    setLoading(true);
    try {
      const checkRes = await fetch('/api/auth/check-exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const checkData = await checkRes.json();
      if (!checkRes.ok) {
        toast.error(checkData.error);
        setLoading(false);
        return;
      }

      const result = await signup(name, email, phone, password);

      if (result.success) {
        setRedirecting(true);
        toast.success('Account created successfully!');
        const dest = result.isAdmin ? '/admin' : '/home';
        router.replace(dest);
        setTimeout(() => router.replace(dest), 100);
      } else {
        toast.error(result.error || 'Failed to create account');
        setLoading(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
      setLoading(false);
    }
  };

  const Logo = () => (
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
      <h1 className="text-xl font-bold text-gray-900 mt-4">
        URBAN <span className="text-primary">AUTO</span>
      </h1>
    </div>
  );

  const SignupCarousel = () => {
    if (carouselItems.length === 0) return null;
    return (
      <div className="mt-4 mb-6" style={{ height: '130px', position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <Carousel
          items={carouselItems}
          baseWidth={380}
          autoplay={true}
          autoplayDelay={3000}
          pauseOnHover={false}
          loop={true}
          round={false}
        />
      </div>
    );
  };

  if (step === 'otp') {
    return (
      <div className="mobile-container bg-white min-h-screen flex flex-col px-6 py-8">
        <Logo />
        <button
          onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); }}
          className="flex items-center gap-1 text-sm text-gray-500 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <SignupCarousel />

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
          disabled={otpVerifying || otp.join('').length !== 6}
          className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {otpVerifying && <Loader2 className="w-4 h-4 animate-spin" />}
          {otpVerifying ? 'Verifying...' : 'Verify Phone'}
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

  if (step === 'details') {
    return (
      <div className="mobile-container bg-white min-h-screen flex flex-col px-6 py-8">
        <Logo />

        <div className="bg-green-50 rounded-xl px-4 py-3 mb-6 flex items-center gap-2">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-green-700 font-medium">+91 {phone} verified</p>
        </div>

        <SignupCarousel />

        <h2 className="text-2xl font-bold text-gray-900 mb-1">Complete Signup</h2>
        <p className="text-gray-500 text-sm mb-6">Fill in your details to create your account</p>

        <form onSubmit={handleCreateAccount} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className={`w-full px-4 py-3 rounded-xl border ${errors.name ? 'border-red-400' : 'border-gray-200'} bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm`}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className={`w-full px-4 py-3 rounded-xl border ${errors.email ? 'border-red-400' : 'border-gray-200'} bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm`}
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
                placeholder="Min 8 characters with 1 number"
                className={`w-full px-4 py-3 rounded-xl border ${errors.password ? 'border-red-400' : 'border-gray-200'} bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm pr-11`}
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

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              className={`w-full px-4 py-3 rounded-xl border ${errors.confirmPassword ? 'border-red-400' : 'border-gray-200'} bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm`}
            />
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold text-sm mt-2 hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Login
          </Link>
        </p>

        <p className="text-center text-xs text-gray-400 mt-4">
          By signing up, you agree to our{' '}
          <Link href="/privacy-policy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mobile-container bg-white min-h-screen flex flex-col px-6 py-8">
      <Logo />

      <SignupCarousel />

      <h2 className="text-2xl font-bold text-gray-900 mb-1">Create Account</h2>
      <p className="text-gray-500 text-sm mb-6">Enter your phone number to get started</p>

      <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">Phone Number</label>
          <div className={`flex items-center border rounded-xl px-4 py-3 bg-gray-50 focus-within:bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all ${errors.phone ? 'border-red-400' : 'border-gray-200'}`}>
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

        <button
          type="submit"
          disabled={otpSending}
          className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold text-sm mt-2 hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {otpSending && <Loader2 className="w-4 h-4 animate-spin" />}
          {otpSending ? 'Sending OTP...' : 'Send OTP'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-semibold hover:underline">
          Login
        </Link>
      </p>

      <p className="text-center text-xs text-gray-400 mt-4">
        By signing up, you agree to our{' '}
        <Link href="/privacy-policy" className="text-primary hover:underline">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}

'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getAssetPath } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function SplashScreen() {
  const { user, isLoading, isAdmin } = useAuth();
  const [minDelayDone, setMinDelayDone] = useState(false);
  const [redirected, setRedirected] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => setMinDelayDone(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fallback = setTimeout(() => {
      if (!redirected && !isLoading) {
        setRedirected(true);
        router.replace('/login');
      }
    }, 5000);
    return () => clearTimeout(fallback);
  }, [redirected, isLoading, router]);

  useEffect(() => {
    if (!minDelayDone || redirected) return;
    if (isLoading) return;

    setRedirected(true);
    if (user) {
      router.replace(isAdmin ? '/admin' : '/home');
    } else {
      router.replace('/login');
    }
  }, [minDelayDone, isLoading, user, isAdmin, redirected, router]);

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center">
      <div className="relative w-[120px] h-[120px] flex items-center justify-center">
        <Image
          src={getAssetPath('/urban-auto-logo.jpg')}
          alt="Urban Auto"
          width={120}
          height={120}
          className="rounded-2xl shadow-xl object-cover"
          priority
        />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mt-6 text-center"
      >
        <h1 className="text-2xl font-bold text-gray-900">
          URBAN <span className="text-primary">AUTO</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1 tracking-widest uppercase">Raipur</p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-20"
      >
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </motion.div>
    </div>
  );
}

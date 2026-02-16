'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, Shield, Star, Zap, Award, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { getAssetPath } from '@/lib/utils';

export default function AboutPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const features = [
    { icon: Zap, title: 'High-Pressure Cleaning', desc: 'Advanced machines for deep cleaning' },
    { icon: Shield, title: 'Spray Injection Systems', desc: 'Professional extraction systems' },
    { icon: Star, title: 'Professional Detailing', desc: 'Premium tools & techniques' },
    { icon: Award, title: 'High-Powered Vacuum', desc: 'Industrial grade cleaning' },
  ];

  const highlights = [
    'Premium chemicals & genuine spare parts',
    'Certified technicians with years of experience',
    'Advanced mechanized cleaning technology',
    'Quality at every step of service',
  ];

  return (
    <div className="mobile-container bg-gray-50 min-h-screen safe-bottom">
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">About Us</h1>
        </div>
      </header>

      <div className="px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm text-center mb-6"
        >
            <Image
              src={getAssetPath('/urban-auto-logo.jpg')}
              alt="Urban Auto"
              width={100}
              height={100}
              className="rounded-xl mx-auto mb-4"
            />

          <h2 className="text-2xl font-bold text-gray-900">
            URBAN <span className="text-primary">AUTO</span>
          </h2>
          <p className="text-sm text-primary font-medium mt-1">
            Designed for Premium Performance
          </p>
          <p className="text-xs text-gray-500 mt-1">Raipur, Chhattisgarh</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-5 shadow-sm mb-4"
        >
          <h3 className="font-bold text-gray-900 mb-3">Our Story</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            Urban Auto is Raipur&apos;s premier modern mechanized car care brand that is changing the way people think about vehicle maintenance. We believe that cars are more than just machines; they are an extension of your lifestyle.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mt-3">
            Every vehicle at Urban Auto is pampered by trained technicians who treat your car with the same care they would their own. From basic cleaning to complex accidental repairs, we ensure quality at every step.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-5 shadow-sm mb-4"
        >
          <h3 className="font-bold text-gray-900 mb-4">Our Technology</h3>
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="bg-gray-50 rounded-xl p-3"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-semibold text-gray-900">{feature.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{feature.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-5 shadow-sm mb-4"
        >
          <h3 className="font-bold text-gray-900 mb-4">Why Choose Us</h3>
          <div className="space-y-3">
            {highlights.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <p className="text-sm text-gray-700">{item}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-primary rounded-2xl p-5 text-white"
        >
          <h3 className="font-bold mb-2">Need Help?</h3>
          <p className="text-sm text-white/80 mb-4">
            Contact us anytime for queries or bookings
          </p>
          <button
            onClick={() => router.push('/contact')}
            className="w-full py-3 bg-white text-primary rounded-xl text-sm font-semibold"
          >
            Contact Urban Auto
          </button>
        </motion.div>
      </div>
    </div>
  );
}

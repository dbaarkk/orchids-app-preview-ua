'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, Phone, Mail, MapPin, Clock, MessageCircle, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { getAssetPath } from '@/lib/utils';

export default function ContactPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading && !user) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const openExternal = (url: string) => {
    window.parent.postMessage({ type: "OPEN_EXTERNAL_URL", data: { url } }, "*");
  };

  const contactOptions = [
    {
      icon: Phone,
      label: 'Call Us',
      value: '+91 88898 22220',
      action: () => openExternal('tel:+918889822220'),
      color: 'bg-green-500',
    },
    {
      icon: MessageCircle,
      label: 'WhatsApp',
      value: 'Chat with us',
      action: () => openExternal('https://wa.me/918889822220'),
      color: 'bg-emerald-500',
    },
    {
      icon: Mail,
      label: 'Email',
      value: 'theurbanauto@gmail.com',
      action: () => openExternal('mailto:theurbanauto@gmail.com'),
      color: 'bg-blue-500',
    },
    {
      icon: MapPin,
      label: 'Location',
      value: 'Sunder Nagar, Raipur',
      action: () => openExternal('https://maps.google.com/?q=Sunder+Nagar+Raipur+Chhattisgarh'),
      color: 'bg-red-500',
    },
  ];

  return (
    <div className="mobile-container bg-gray-50 min-h-screen safe-bottom">
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Contact Us</h1>
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
              width={80}
              height={80}
              className="rounded-xl mx-auto mb-4"
            />

          <h2 className="text-xl font-bold text-gray-900">
            URBAN <span className="text-primary">AUTO</span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Premium Car Care & Services in Raipur
          </p>
        </motion.div>

        <div className="space-y-3">
          {contactOptions.map((option, index) => (
            <motion.button
              key={option.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={option.action}
              className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 ${option.color} rounded-xl flex items-center justify-center`}>
                <option.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                <p className="text-xs text-gray-500">{option.value}</p>
              </div>
              <ExternalLink className="w-5 h-5 text-gray-400" />
            </motion.button>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 bg-white rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Working Hours</p>
              <p className="text-xs text-gray-500">We&apos;re here to help</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Monday - Sunday</span>
              <span className="text-sm font-semibold text-gray-900">9:00 AM - 9:00 PM</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 bg-white rounded-2xl p-4 shadow-sm"
        >
          <h3 className="font-semibold text-gray-900 mb-3">Visit Our Workshop</h3>
          <div className="bg-gray-100 rounded-xl p-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              <strong>URBAN AUTO</strong><br />
              Sunder Nagar, Raipur<br />
              Chhattisgarh, India
            </p>
          </div>
          <button
            onClick={() => openExternal('https://maps.google.com/?q=Sunder+Nagar+Raipur+Chhattisgarh')}
            className="mt-3 w-full py-3 bg-primary text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4" />
            Open in Maps
          </button>
        </motion.div>
      </div>
    </div>
  );
}

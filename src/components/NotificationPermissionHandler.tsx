'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useNativeNotifications } from '@/hooks/useNativeNotifications';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';

export default function NotificationPermissionHandler() {
  const { user } = useAuth();
  const { registerNotifications, status } = useNativeNotifications();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Only proceed if user is logged in and notification status is 'prompt' (not yet decided)
    // We check user?.id to ensure the user is fully loaded and authenticated
    if (user?.id && status === 'prompt') {
      const asked = localStorage.getItem('ua_notif_permission_prompted');
      if (!asked) {
        // Delay slightly for better UX after login/signup
        const timer = setTimeout(() => setShowModal(true), 1500);
        return () => clearTimeout(timer);
      }
    } else if (!user) {
        // Reset state if user logs out
        setShowModal(false);
    }
  }, [user?.id, status]);

  const handleEnable = async () => {
    localStorage.setItem('ua_notif_permission_prompted', 'true');
    setShowModal(false);
    await registerNotifications();
  };

  const handleNoThanks = () => {
    localStorage.setItem('ua_notif_permission_prompted', 'true');
    setShowModal(false);
  };

  return (
    <AnimatePresence>
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden"
          >
            {/* Design elements to match Urban Auto */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-primary" />
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-3">
                Stay tuned for future updates
              </h2>

              <p className="text-gray-600 text-sm leading-relaxed mb-8">
                Stay tuned for future updates by enabling notifications
              </p>

              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={handleEnable}
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-sm hover:bg-primary/90 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
                >
                  Enable
                </button>

                <button
                  onClick={handleNoThanks}
                  className="w-full py-3 text-gray-400 font-semibold text-sm hover:text-gray-600 transition-all"
                >
                  No thanks
                </button>
              </div>
            </div>

            <button
              onClick={handleNoThanks}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

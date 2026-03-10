'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useNativeNotifications } from '@/hooks/useNativeNotifications';
import NotificationModal from './NotificationModal';

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
    // Call register first to ensure user gesture is preserved for the browser popup
    await registerNotifications();
    localStorage.setItem('ua_notif_permission_prompted', 'true');
    setShowModal(false);
  };

  const handleNoThanks = () => {
    localStorage.setItem('ua_notif_permission_prompted', 'true');
    setShowModal(false);
  };

  return (
    <NotificationModal
        isOpen={showModal}
        onClose={handleNoThanks}
        onEnable={handleEnable}
    />
  );
}

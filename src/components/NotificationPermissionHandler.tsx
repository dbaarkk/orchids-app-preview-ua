'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useNativeNotifications } from '@/hooks/useNativeNotifications';

export default function NotificationPermissionHandler() {
  const { user } = useAuth();
  const { registerNotifications, status } = useNativeNotifications();

  useEffect(() => {
    // Only proceed if user is logged in and notification status is 'prompt' (not yet decided)
    if (user && status === 'prompt') {
      const asked = localStorage.getItem('notif_permission_asked');
      if (!asked) {
        registerNotifications().then(() => {
          localStorage.setItem('notif_permission_asked', 'true');
        });
      }
    }
  }, [user, status, registerNotifications]);

  return null;
}

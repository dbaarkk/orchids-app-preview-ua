'use client';

import { useState, useCallback, useEffect } from 'react';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export const useNativeNotifications = () => {
  const [status, setStatus] = useState<'prompt' | 'granted' | 'denied' | 'error' | 'loading'>('loading');
  const [token, setToken] = useState<string | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  const saveToken = useCallback(async (deviceToken: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('device_tokens')
        .upsert(
          { user_id: user.id, token: deviceToken, platform: Capacitor.getPlatform() },
          { onConflict: 'token' }
        );
      if (error) console.error('Error saving device token:', error);
    } catch (err) {
      console.error('Failed to save device token', err);
    }
  }, [user]);

  const registerNotifications = useCallback(async () => {
    // ── WEB BROWSER PATH ──────────────────────────────────────────────
    if (typeof window !== 'undefined' && 'Notification' in window && !Capacitor.isNativePlatform()) {

      // If already granted skip the permission dialog and just (re)register token
      if (Notification.permission === 'granted') {
        setStatus('granted');
        await registerWebToken(user, setToken, saveToken);
        return true;
      }

      // If previously denied, guide user to browser settings
      if (Notification.permission === 'denied') {
        setStatus('denied');
        toast.error('Notifications are blocked. Please enable them in your browser settings (🔒 lock icon in the address bar).');
        return false;
      }

      // Permission is 'default' — ask the user via Chrome's native popup
      const permission = await Notification.requestPermission();
      setStatus(permission as any);

      if (permission !== 'granted') {
        return false;
      }

      // Granted — register push token
      await registerWebToken(user, setToken, saveToken);
      return true;
    }

    // ── NATIVE (CAPACITOR) PATH ────────────────────────────────────────
    try {
      const permStatus = await PushNotifications.requestPermissions();
      const newStatus = permStatus.receive as any;
      setStatus(newStatus);
      if (newStatus !== 'granted') return false;

      await PushNotifications.register();
      PushNotifications.removeAllListeners();

      PushNotifications.addListener('registration', (t: Token) => {
        setToken(t.value);
        saveToken(t.value);
        setStatus('granted');
      });
      PushNotifications.addListener('registrationError', () => setStatus('error'));
      PushNotifications.addListener('pushNotificationReceived', (n: PushNotificationSchema) => {
        console.log('Foreground push:', n);
      });
      PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        const data = action.notification.data;
        if (data?.type === 'booking_confirmed') router.push('/bookings');
      });

      return true;
    } catch (err) {
      console.error('Native push error:', err);
      setStatus('error');
      return false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, saveToken, router]);

  // Initialise status on mount (web only)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      PushNotifications.checkPermissions().then((res) => {
        setStatus(res.receive as any);
        if (res.receive === 'granted') registerNotifications();
      });
    } else {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const p = Notification.permission;
        if (p === 'granted') {
          setStatus('granted');
          // Re-sync token silently
          registerWebToken(user, setToken, saveToken);
        } else if (p === 'denied') {
          setStatus('denied');
        } else {
          setStatus('prompt');
        }
      } else {
        setStatus('denied');
      }
    }
  // only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-sync token when user logs in after permission already granted
  useEffect(() => {
    if (user && token) saveToken(token);
  }, [user, token, saveToken]);

  return { registerNotifications, status, token };
};

// ── Helper: register a web push token via Firebase SDK or fallback ────
async function registerWebToken(
  user: any,
  setToken: (t: string) => void,
  saveToken: (t: string) => Promise<void>
) {
  try {
    const { initializeApp, getApps } = await import('firebase/app');
    const { getMessaging, getToken } = await import('firebase/messaging');

    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    if (firebaseConfig.projectId && firebaseConfig.messagingSenderId) {
      const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
      const messaging = getMessaging(app);

      let fcmSwReg: ServiceWorkerRegistration | undefined;
      try {
        fcmSwReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;
      } catch { /* fall through */ }

      const swReg = fcmSwReg ?? (await navigator.serviceWorker.ready);
      const fcmToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });

      if (fcmToken) {
        setToken(fcmToken);
        await saveToken(fcmToken);
        toast.success('Notifications enabled!');
        return;
      }
    }
  } catch (sdkErr) {
    console.warn('Firebase SDK token failed, using web push fallback:', sdkErr);
  }

  // Fallback: Web Push subscription
  try {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        const opts: PushSubscriptionOptionsInit = { userVisibleOnly: true };
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (vapidKey) {
          const padding = '='.repeat((4 - (vapidKey.length % 4)) % 4);
          const base64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
          const raw = atob(base64);
          const key = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) key[i] = raw.charCodeAt(i);
          opts.applicationServerKey = key;
        }
        try { sub = await reg.pushManager.subscribe(opts); } catch { /* ignore */ }
      }

      if (sub) {
        const ep = sub.endpoint;
        const browserToken = ep.includes('fcm.googleapis.com')
          ? ep.split('/').pop()!
          : JSON.stringify(sub);
        setToken(browserToken);
        await saveToken(browserToken);
        toast.success('Notifications enabled!');
        return;
      }
    }
  } catch (err) {
    console.error('Web push fallback error:', err);
  }

  toast.success('Notifications enabled!');
}

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
        .upsert({
          user_id: user.id,
          token: deviceToken,
          platform: Capacitor.getPlatform(),
        }, { onConflict: 'token' });

      if (error) console.error('Error saving device token:', error);
    } catch (err) {
      console.error('Failed to save device token', err);
    }
  }, [user]);

  const registerNotifications = useCallback(async () => {
    // Check platform
    const isNative = Capacitor.isNativePlatform();

    if (!isNative) {
      // BROWSER PATH
      if (typeof window === 'undefined' || !('Notification' in window)) {
        setStatus('denied');
        return false;
      }

      // Important: Call requestPermission as directly as possible to preserve user gesture
      const permission = await Notification.requestPermission();
      setStatus(permission as any);

      if (permission !== 'granted') {
        if (permission === 'denied') {
          toast.error('Notification permission denied. Please enable it in browser settings.');
        }
        return false;
      }

      // If granted, proceed with subscription
      try {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          const registration = await navigator.serviceWorker.ready;

          // Try to get existing subscription
          let subscription = await registration.pushManager.getSubscription();

          if (!subscription) {
            // Attempt to subscribe.
            // Note: Modern browsers usually require a VAPID applicationServerKey.
            // If FCM_API_KEY is for Legacy API, we might not have a VAPID key.
            // We'll try a default subscribe and fallback to JSON token if endpoint is generic.
            try {
              subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true
              });
            } catch (subErr) {
              console.error('Browser push subscription failed:', subErr);
            }
          }

          if (subscription) {
            const endpoint = subscription.endpoint;
            let browserToken = endpoint;

            // Extract token for FCM if possible, otherwise store whole endpoint
            if (endpoint.includes('fcm.googleapis.com')) {
              const segments = endpoint.split('/');
              browserToken = segments[segments.length - 1];
            } else {
              browserToken = JSON.stringify(subscription);
            }

            setToken(browserToken);
            await saveToken(browserToken);
            toast.success('Notifications enabled successfully!');
            return true;
          }
        }
      } catch (err) {
        console.error('Detailed browser push error:', err);
      }
      return true; // Return true as permission was at least granted
    }

    // NATIVE PATH
    try {
      const permStatus = await PushNotifications.requestPermissions();
      const newStatus = permStatus.receive as any;
      setStatus(newStatus);

      if (newStatus !== 'granted') return false;

      await PushNotifications.register();

      // Clear existing listeners to avoid duplicates
      PushNotifications.removeAllListeners();

      PushNotifications.addListener('registration', (token: Token) => {
        console.log('Native push token received:', token.value);
        setToken(token.value);
        saveToken(token.value);
        setStatus('granted');
      });

      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Native registration error:', error);
        setStatus('error');
      });

      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Foreground push received:', notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('Push action performed:', action);
        const data = action.notification.data;
        if (data.type === 'booking_confirmed' && data.booking_id) {
          router.push('/bookings');
        }
      });

      return true;
    } catch (err) {
      console.error('Native push setup error:', err);
      setStatus('error');
      return false;
    }
  }, [user?.id, saveToken, router]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      PushNotifications.checkPermissions().then((res) => {
        setStatus(res.receive as any);
        if (res.receive === 'granted') {
          registerNotifications();
        }
      });
    } else {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        // Map browser statuses to our internal status
        const browserPerm = Notification.permission;
        if (browserPerm === 'default') setStatus('prompt');
        else if (browserPerm === 'granted') {
          setStatus('granted');
          // Auto-register browser if already granted to sync token
          registerNotifications();
        }
        else setStatus('denied');
      } else {
        setStatus('denied');
      }
    }
  }, [registerNotifications]);

  useEffect(() => {
    if (user && token) {
      saveToken(token);
    }
  }, [user, token, saveToken]);

  return { registerNotifications, status, token };
};

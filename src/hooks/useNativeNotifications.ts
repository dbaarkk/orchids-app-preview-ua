'use client';

import { useState, useCallback, useEffect } from 'react';
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

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
    if (!Capacitor.isNativePlatform()) return false;

    try {
      // 1. Request Permissions
      let permStatus = await PushNotifications.requestPermissions();
      setStatus(permStatus.receive as any);

      if (permStatus.receive !== 'granted') return false;

      // 2. Register
      await PushNotifications.register();

      // 3. Handle Events
      PushNotifications.addListener('registration', (token: Token) => {
        console.log('Push registration success, token: ' + token.value);
        setToken(token.value);
        saveToken(token.value);
      });

      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Error on registration: ' + JSON.stringify(error));
        setStatus('error');
      });

      PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('Push received: ' + JSON.stringify(notification));
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('Push action performed: ' + JSON.stringify(action));
        const data = action.notification.data;
        if (data.type === 'booking_confirmed' && data.booking_id) {
          router.push('/bookings'); // Since we don't have a specific detail page, we go to bookings list or we can try to scroll to it
        }
      });

      return true;
    } catch (err) {
      console.error('Error setting up push notifications', err);
      setStatus('error');
      return false;
    }
  }, [user]);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      PushNotifications.checkPermissions().then((res) => {
        setStatus(res.receive as any);
        if (res.receive === 'granted') {
          registerNotifications();
        }
      });
    } else {
      setStatus('denied');
    }
  }, [registerNotifications]);

  useEffect(() => {
    if (user && token) {
      saveToken(token);
    }
  }, [user, token, saveToken]);

  return { registerNotifications, status, token };
};

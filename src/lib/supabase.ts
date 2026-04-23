import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

const isNative = typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.();

let capacitorStorage: any = undefined;

if (isNative) {
  const { Preferences } = require('@capacitor/preferences');
  capacitorStorage = {
    getItem: async (key: string) => {
      try {
        const { value } = await Preferences.get({ key });
        return value;
      } catch {
        return localStorage.getItem(key);
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        await Preferences.set({ key, value });
      } catch {
        localStorage.setItem(key, value);
      }
    },
    removeItem: async (key: string) => {
      try {
        await Preferences.remove({ key });
      } catch {
        localStorage.removeItem(key);
      }
    }
  };
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: capacitorStorage || (typeof window !== 'undefined' ? localStorage : undefined),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://pfvdqlmivraggxzsbymv.supabase.co";
const supabaseAnonKey = "sb_publishable_GH7jXDuB_yY-e9elC8SNpQ_2o5_1E3s";

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

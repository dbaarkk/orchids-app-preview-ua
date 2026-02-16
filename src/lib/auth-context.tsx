'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { supabase } from './supabase';

export interface UserAddress {
  line1: string;
  line2: string;
  state: string;
  city: string;
  pincode: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    address?: UserAddress;
    locationAddress?: string;
    locationCoords?: { lat: number; lng: number };
    verified?: boolean;
    blocked?: boolean;
    walletBalance?: number;
  }

export interface Booking {
  id: string;
  userId: string;
  serviceName: string;
  bookingDate: string;
  preferredDateTime: string;
  vehicleType: string;
  vehicleNumber?: string;
  vehicleMakeModel?: string;
  serviceMode?: string;
  address: string;
  notes?: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Rescheduled' | 'Cancelled';
    totalAmount?: number;
    rescheduledBy?: 'user' | 'admin' | null;
    paymentStatus?: string;
    paymentMethod?: string;
    createdAt: string;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string; isAdmin?: boolean }>;
    loginWithPhone: (phone: string) => Promise<{ success: boolean; error?: string; isAdmin?: boolean }>;
    signup: (name: string, email: string, phone: string, password: string) => Promise<{ success: boolean; error?: string; isAdmin?: boolean }>;
    logout: () => Promise<void>;
    bookings: Booking[];
    refreshBookings: () => Promise<void>;
    updateAddress: (address: UserAddress) => Promise<{ success: boolean; error?: string }>;
    updateLocation: (address: string, coords: { lat: number; lng: number }) => Promise<{ success: boolean; error?: string }>;
    addBooking: (booking: any) => Promise<{ success: boolean; error?: string }>;
    cancelBooking: (bookingId: string) => Promise<{ success: boolean; error?: string }>;
    rescheduleBooking: (bookingId: string, newDateTime: string) => Promise<{ success: boolean; error?: string }>;
    updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
    refreshUser: () => Promise<void>;
    isAdmin: boolean;
  }

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'theurbanauto@gmail.com';

function formatAddress(addr?: UserAddress): string {
  if (!addr || !addr.line1) return '';
  const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.pincode].filter(Boolean);
  return parts.join(', ');
}

function mapProfileToUser(profile: any): User {
  return {
    id: profile.id,
    name: profile.full_name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    address: (profile.address_line1 || profile.state || profile.city || profile.pincode) ? {
      line1: profile.address_line1 || '',
      line2: profile.address_line2 || '',
      state: profile.state || '',
      city: profile.city || '',
      pincode: profile.pincode || '',
    } : undefined,
    locationAddress: profile.location_address,
    locationCoords: profile.location_coords,
    verified: profile.verified ?? false,
    blocked: profile.blocked ?? false,
    walletBalance: profile.wallet_balance ?? 0,
  };
}

function mapBooking(b: any): Booking {
  return {
    id: b.id,
    userId: b.user_id,
    serviceName: b.service_name,
    bookingDate: b.booking_date,
    preferredDateTime: b.preferred_date_time || b.booking_date,
    vehicleType: b.vehicle_type || 'Unknown',
    vehicleNumber: b.vehicle_number,
    vehicleMakeModel: b.vehicle_make_model,
    serviceMode: b.service_mode,
    address: b.address || '',
    notes: b.notes,
    status: b.status || 'Pending',
      totalAmount: b.total_amount,
      rescheduledBy: b.rescheduled_by || null,
      paymentStatus: b.payment_status || 'unpaid',
      paymentMethod: b.payment_method || 'pay_later',
      createdAt: b.created_at
  };
}

async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}

async function fetchBookings(userId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(mapBooking);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('ua_cached_user');
        return cached ? JSON.parse(cached) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<User | null>(null);

    useEffect(() => {
      userRef.current = user;
      if (typeof window !== 'undefined') {
        if (user) {
          localStorage.setItem('ua_cached_user', JSON.stringify(user));
        } else {
          localStorage.removeItem('ua_cached_user');
        }
      }
    }, [user]);

  useEffect(() => {
    let mounted = true;

    const loadUser = async (userId: string, email?: string, meta?: any) => {
        const profilePromise = fetchProfile(userId);
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
        const profile = await Promise.race([profilePromise, timeoutPromise]);
        if (!mounted) return;
        if (profile) {
          const u = mapProfileToUser(profile);
          setUser(u);
          userRef.current = u;
          fetchBookings(u.id).then(b => { if (mounted) setBookings(b); });
        } else {
          const u: User = {
            id: userId,
            name: meta?.full_name || 'User',
            email: email || '',
            phone: meta?.phone || ''
          };
          setUser(u);
          userRef.current = u;
        }
      };

      const init = async () => {
          try {
            const sessionPromise = supabase.auth.getSession();
            const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
            const result = await Promise.race([sessionPromise, timeoutPromise]);
            if (!mounted) return;
            const session = result && 'data' in result ? result.data.session : null;
            if (session?.user) {
              await loadUser(session.user.id, session.user.email, session.user.user_metadata);
            } else {
              setUser(null);
              userRef.current = null;
            }
          } catch {
            setUser(null);
            userRef.current = null;
          }
          if (mounted) setIsLoading(false);
        };

      init();

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;
        if (event === 'SIGNED_OUT') {
          setUser(null);
          userRef.current = null;
          setBookings([]);
          return;
        }
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          await loadUser(session.user.id, session.user.email, session.user.user_metadata);
          if (mounted) setIsLoading(false);
        }
        if (event === 'SIGNED_IN' && session?.user && !userRef.current) {
          await loadUser(session.user.id, session.user.email, session.user.user_metadata);
          if (mounted) setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const current = userRef.current;
    if (!current || current.email?.toLowerCase() === ADMIN_EMAIL) return;

    const channel = supabase
      .channel('user-bookings-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${current.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setBookings(prev => prev.map(b => b.id === payload.new.id ? mapBooking(payload.new) : b));
          } else if (payload.eventType === 'INSERT') {
            setBookings(prev => {
              if (prev.some(b => b.id === payload.new.id)) return prev;
              return [mapBooking(payload.new), ...prev];
            });
          } else if (payload.eventType === 'DELETE') {
            setBookings(prev => prev.filter(b => b.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${current.id}`,
        },
        (payload) => {
          const updated = mapProfileToUser(payload.new);
          setUser(updated);
          userRef.current = updated;
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

    const login = useCallback(async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        if (!data.session?.user) {
          return { success: false, error: 'Login failed - no session returned' };
        }

        const profile = await fetchProfile(data.session.user.id);

        if (profile?.blocked) {
          await supabase.auth.signOut();
          return { success: false, error: 'Your account has been blocked. Contact support.' };
        }

        const u = profile ? mapProfileToUser(profile) : {
          id: data.session.user.id,
          name: data.session.user.user_metadata?.full_name || 'User',
          email: data.session.user.email || email,
          phone: data.session.user.user_metadata?.phone || '',
        };
        setUser(u);
        userRef.current = u;

        fetchBookings(u.id).then(b => setBookings(b));

        return { success: true, isAdmin: email.toLowerCase() === ADMIN_EMAIL };
      } catch (error: any) {
        return { success: false, error: error.message || 'Invalid credentials' };
      }
    }, []);

  const loginWithPhone = useCallback(async (phone: string) => {
    try {
      const res = await fetch('/api/auth/phone-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: result.email,
        password: result.tempPassword,
      });
      if (error) throw error;

      if (!data.session?.user) {
        return { success: false, error: 'Login failed - no session returned' };
      }

      const profile = await fetchProfile(data.session.user.id);
      if (profile?.blocked) {
        await supabase.auth.signOut();
        return { success: false, error: 'Your account has been blocked. Contact support.' };
      }

      const u = profile ? mapProfileToUser(profile) : {
        id: data.session.user.id,
        name: data.session.user.user_metadata?.full_name || 'User',
        email: result.email,
        phone,
      };
      setUser(u);
      userRef.current = u;
      fetchBookings(u.id).then(b => setBookings(b));

      return { success: true, isAdmin: result.email?.toLowerCase() === ADMIN_EMAIL };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, phone: string, password: string) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password, otpVerified: true }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned an invalid response');
      }

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Signup failed');

      const signInPromise = supabase.auth.signInWithPassword({ email, password });
      const { data, error } = await signInPromise;
      if (error) throw error;

      if (!data.session?.user) {
        return { success: false, error: 'Account created but login failed' };
      }

      const u: User = {
          id: data.session.user.id,
          name,
          email,
          phone,
          verified: true,
          blocked: false,
        };
      setUser(u);
      userRef.current = u;

      fetchProfile(data.session.user.id).then(profile => {
        if (profile) {
          const fullUser = mapProfileToUser(profile);
          setUser(fullUser);
          userRef.current = fullUser;
        }
      });

      return { success: true, isAdmin: email.toLowerCase() === ADMIN_EMAIL };
    } catch (error: any) {
      return { success: false, error: error.message || 'An unexpected error occurred' };
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    userRef.current = null;
    setBookings([]);
    try {
      await supabase.auth.signOut();
    } catch {}
  }, []);

  const refreshBookings = useCallback(async () => {
    const current = userRef.current;
    if (!current) return;
    const b = await fetchBookings(current.id);
    setBookings(b);
  }, []);

  const updateAddress = useCallback(async (address: UserAddress) => {
    const current = userRef.current;
    if (!current) return { success: false, error: 'Not logged in' };

    try {
      const fullAddress = formatAddress(address);
      const { error } = await supabase
        .from('profiles')
        .update({
          address_line1: address.line1,
          address_line2: address.line2,
          state: address.state,
          city: address.city,
          pincode: address.pincode,
          location_address: fullAddress,
          updated_at: new Date().toISOString()
        })
        .eq('id', current.id);

      if (error) throw error;

      setUser(prev => prev ? { ...prev, address, locationAddress: fullAddress } : null);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, []);

  const updateLocation = useCallback(async (address: string, coords: { lat: number; lng: number }) => {
    const current = userRef.current;
    if (!current) return { success: false, error: 'Not logged in' };

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          location_address: address,
          location_coords: coords,
          updated_at: new Date().toISOString()
        })
        .eq('id', current.id);

      if (error) throw error;

      setUser(prev => prev ? { ...prev, locationAddress: address, locationCoords: coords } : null);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, []);

  const addBooking = useCallback(async (bookingData: any) => {
    const current = userRef.current;
    if (!current) return { success: false, error: 'Not logged in' };

      if (current.blocked) return { success: false, error: 'Your account has been blocked.' };

      try {
          let bookingDateISO = new Date().toISOString();
          if (bookingData.preferredDateTime) {
            const [d, t] = bookingData.preferredDateTime.split(' ');
            if (d && t) {
              try { bookingDateISO = new Date(`${d}T${t}`).toISOString(); } catch {}
            }
          }

          const bookingAddress = bookingData.address || (current.address ? formatAddress(current.address) : current.locationAddress || '');

            const { data, error } = await supabase
              .from('bookings')
              .insert([{
                user_id: current.id,
                service_name: bookingData.serviceName || 'General Service',
                vehicle_type: bookingData.vehicleType || 'Unknown',
                vehicle_number: bookingData.vehicleNumber || '',
                vehicle_make_model: bookingData.vehicleMakeModel || '',
                service_mode: bookingData.serviceMode || 'Pickup & Drop',
                address: bookingAddress,
                preferred_date_time: bookingData.preferredDateTime || bookingDateISO,
                booking_date: bookingDateISO,
                notes: bookingData.notes || '',
                status: 'Pending',
                total_amount: bookingData.totalAmount || 0,
                user_name: current.name,
                user_email: current.email,
                user_phone: current.phone,
              payment_method: bookingData.paymentMethod || 'pay_later',
                  coupon_code: bookingData.couponCode || null,
                  discount_amount: bookingData.discountAmount || 0,
                  payment_status: bookingData.paymentStatus || 'unpaid',
                  razorpay_order_id: bookingData.razorpayOrderId || null,
                  razorpay_payment_id: bookingData.razorpayPaymentId || null,
              }])
            .select();

          if (error) throw error;

      if (data && data[0]) {
        setBookings(prev => [mapBooking(data[0]), ...prev]);
      }

      return { success: true };
      } catch (error: any) {
          return { success: false, error: error.message || 'Failed to create booking' };
        }
    }, []);

  const cancelBooking = useCallback(async (bookingId: string) => {
    const current = userRef.current;
    if (!current) return { success: false, error: 'Not logged in' };

    try {
      const response = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, userId: current.id }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'Cancelled' } : b));
      // Refresh user to get updated wallet balance if refund happened
      fetchProfile(current.id).then(profile => {
        if (profile) {
          const updated = mapProfileToUser(profile);
          setUser(updated);
          userRef.current = updated;
        }
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, []);

  const rescheduleBooking = useCallback(async (bookingId: string, newDateTime: string) => {
    try {
      const [d, t] = newDateTime.split(' ');
      let bookingDateISO = new Date().toISOString();
      if (d && t) {
        bookingDateISO = new Date(`${d}T${t}`).toISOString();
      }

      const { error } = await supabase
          .from('bookings')
          .update({ preferred_date_time: newDateTime, booking_date: bookingDateISO, status: 'Rescheduled', rescheduled_by: 'user' })
          .eq('id', bookingId);

        if (error) throw error;
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, preferredDateTime: newDateTime, status: 'Rescheduled', rescheduledBy: 'user' } : b));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }, []);

    const updatePassword = useCallback(async (newPassword: string) => {
      try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message || 'Failed to update password' };
      }
    }, []);

    const refreshUser = useCallback(async () => {
      const current = userRef.current;
      if (!current) return;
      const profile = await fetchProfile(current.id);
      if (profile) {
        const u = mapProfileToUser(profile);
        setUser(u);
        userRef.current = u;
      }
    }, []);

    const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;

  return (
    <AuthContext.Provider value={{
        user, isLoading, login, loginWithPhone, signup, logout, bookings, refreshBookings,
        updateAddress, updateLocation, addBooking, cancelBooking, rescheduleBooking,
        updatePassword, refreshUser, isAdmin,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

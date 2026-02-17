'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { LogOut, Check, RefreshCw, ChevronDown, ChevronUp, User, Phone, Mail, MapPin, Car, FileText, Calendar, Loader2, Copy, Users, CalendarDays, KeyRound, Eye, EyeOff, X, ShieldCheck, IndianRupee, Wrench, AlertTriangle, Truck, Home, Search, Ticket, Plus, Trash2, ToggleLeft, ToggleRight, ChevronRight, Bell, Settings, Image as ImageIcon, QrCode, MessageSquare, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AdminBooking {
  id: string;
  user_id: string;
  service_name: string;
  vehicle_type: string;
  vehicle_number: string;
  vehicle_make_model: string;
  service_mode: string;
  address: string;
  preferred_date_time: string;
  booking_date: string;
  notes: string;
  status: string;
  total_amount: number;
  rescheduled_by: string | null;
  created_at: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  payment_status: string;
  payment_method: string;
  location_coords?: { lat: number; lng: number };
  manual_location_link?: string;
}

interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  created_at: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  location_address: string;
  verified: boolean;
  blocked: boolean;
  wallet_balance: number;
  location_coords?: { lat: number; lng: number };
}

interface ServicePrice {
  id: string;
  service_id: string;
  service_name: string;
  price_sedan: number;
  price_hatchback: number;
  price_suv: number;
  price_luxury: number;
}

interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  active: boolean;
  user_id: string | null;
  created_at: string;
  usage_limit: number;
}

async function adminFetch(resource: string) {
  const res = await fetch(`/api/admin?resource=${resource}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json.data;
}

async function adminAction(body: any) {
  const res = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
}

export default function AdminPanel() {
  const { user, isLoading, isAdmin, logout, updatePassword } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'bookings' | 'users' | 'services' | 'coupons'>('bookings');
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'Pending' | 'Confirmed' | 'Completed' | 'Rescheduled' | 'Cancelled'>('all');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceForm, setPriceForm] = useState({ sedan: '', hatchback: '', suv: '', luxury: '' });
  const [quoteMode, setQuoteMode] = useState({ sedan: false, hatchback: false, suv: false, luxury: false });
  const [savingPrice, setSavingPrice] = useState(false);
  const [bookingSearch, setBookingSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('');
  const [addingCoupon, setAddingCoupon] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationContent, setNotificationContent] = useState('');
  const [pushingNotification, setPushingNotification] = useState(false);

  const [showCarouselModal, setShowCarouselModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [appConfig, setAppConfig] = useState<any>({});
  const [newCarouselUrl, setNewCarouselUrl] = useState('');
  const [upiId, setUpiId] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const carouselFileRef = useRef<HTMLInputElement>(null);
  const qrFileRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('app-assets')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('app-assets')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const fetchConfig = useCallback(async () => {
    try {
      const data = await adminFetch('app-config');
      setAppConfig(data);
      setUpiId(data.payment_config?.upi_id || '');
      setQrCodeUrl(data.payment_config?.qr_code_url || '');
    } catch { toast.error('Failed to load config'); }
  }, []);

  useEffect(() => {
    if (isAdmin && (showCarouselModal || showPaymentModal)) fetchConfig();
  }, [isAdmin, showCarouselModal, showPaymentModal, fetchConfig]);

  useEffect(() => {
    if (!isLoading && !loggingOut && (!user || !isAdmin)) {
      router.replace('/login');
    }
  }, [isLoading, user, isAdmin, router, loggingOut]);

  const fetchBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const data = await adminFetch('bookings');
      setBookings(data || []);
    } catch { toast.error('Failed to load bookings'); }
    setLoadingBookings(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-bookings-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bookings' },
        (payload) => {
          setBookings(prev => [payload.new as AdminBooking, ...prev]);
          toast.success('New booking received!', { position: 'top-right' });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings' },
        (payload) => {
          setBookings(prev => prev.map(b => b.id === payload.new.id ? { ...b, ...payload.new } : b));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const fetchProfiles = useCallback(async () => {
    setLoadingProfiles(true);
    try {
      const data = await adminFetch('profiles');
      setProfiles(data || []);
    } catch { toast.error('Failed to load profiles'); }
    setLoadingProfiles(false);
  }, []);

  const fetchServicePrices = useCallback(async () => {
    setLoadingServices(true);
    try {
      const data = await adminFetch('services');
      setServicePrices(data || []);
    } catch { toast.error('Failed to load services'); }
    setLoadingServices(false);
  }, []);

  const fetchCoupons = useCallback(async () => {
    setLoadingCoupons(true);
    try {
      const data = await adminFetch('coupons');
      setCoupons(data || []);
    } catch { toast.error('Failed to load coupons'); }
    setLoadingCoupons(false);
  }, []);

  useEffect(() => {
    if (isAdmin) fetchBookings();
  }, [isAdmin, fetchBookings]);

  useEffect(() => {
    if (isAdmin && activeTab === 'users') fetchProfiles();
    if (isAdmin && activeTab === 'services') fetchServicePrices();
    if (isAdmin && activeTab === 'coupons') fetchCoupons();
  }, [isAdmin, activeTab, fetchProfiles, fetchServicePrices, fetchCoupons]);

  const updateBookingStatus = async (id: string, status: string) => {
    setConfirmingId(id);
    try {
      await adminAction({ action: 'update-booking-status', bookingId: id, status });
      toast.success(`Booking ${status.toLowerCase()}`);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    } catch { toast.error('Failed to update booking'); }
    setConfirmingId(null);
  };

  const rescheduleBooking = async (id: string) => {
    if (!rescheduleDate || !rescheduleTime) { toast.error('Please select both date and time'); return; }
    setRescheduleLoading(true);
    const dateObj = new Date(`${rescheduleDate}T${rescheduleTime}`);
    const formatted = dateObj.toLocaleString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
    try {
      await adminAction({ action: 'reschedule-booking', bookingId: id, dateTime: formatted });
      toast.success('Booking rescheduled');
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'Rescheduled', preferred_date_time: formatted, rescheduled_by: 'admin' } : b));
      setRescheduleId(null);
      setRescheduleDate('');
      setRescheduleTime('');
    } catch { toast.error('Failed to reschedule'); }
    setRescheduleLoading(false);
  };

  const copyBookingDetails = (booking: AdminBooking) => {
    const details = [
      `Service: ${booking.service_name}`,
      `Customer: ${booking.user_name || 'Unknown'}`,
      `Email: ${booking.user_email || 'N/A'}`,
      `Phone: ${booking.user_phone || 'N/A'}`,
      `Vehicle: ${booking.vehicle_type}${booking.vehicle_number ? ` - ${booking.vehicle_number}` : ''}`,
      booking.vehicle_make_model ? `Make/Model: ${booking.vehicle_make_model}` : '',
      booking.service_mode ? `Mode: ${booking.service_mode}` : '',
      `Date/Time: ${booking.preferred_date_time || new Date(booking.booking_date).toLocaleString()}`,
      `Address: ${booking.address || 'No address'}`,
      booking.notes ? `Notes: ${booking.notes}` : '',
      `Status: ${booking.status}`,
      booking.total_amount ? `Amount: ₹${booking.total_amount}/- (${booking.payment_status === 'paid' ? 'Paid' : 'Unpaid'})` : 'Amount: Get Quote',
      `Booked: ${new Date(booking.created_at).toLocaleString()}`,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(details).then(() => toast.success('Copied')).catch(() => toast.error('Failed to copy'));
  };

  const handlePasswordReset = async () => {
    if (!newPassword || newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmNewPassword) { toast.error('Passwords do not match'); return; }
    setPasswordLoading(true);
    const result = await updatePassword(newPassword);
    if (result.success) {
      toast.success('Password updated');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmNewPassword('');
    } else toast.error(result.error || 'Failed');
    setPasswordLoading(false);
  };

  const startEditPrice = (sp: ServicePrice) => {
    setEditingPrice(sp.service_id);
    setPriceForm({
      sedan: String(sp.price_sedan),
      hatchback: String(sp.price_hatchback),
      suv: String(sp.price_suv),
      luxury: String(sp.price_luxury),
    });
    setQuoteMode({
      sedan: Number(sp.price_sedan) === 0,
      hatchback: Number(sp.price_hatchback) === 0,
      suv: Number(sp.price_suv) === 0,
      luxury: Number(sp.price_luxury) === 0,
    });
  };

  const savePrice = async (serviceId: string) => {
    setSavingPrice(true);
    try {
      await adminAction({
        action: 'update-service-price',
        serviceId,
        prices: {
          price_sedan: quoteMode.sedan ? 0 : (Number(priceForm.sedan) || 0),
          price_hatchback: quoteMode.hatchback ? 0 : (Number(priceForm.hatchback) || 0),
          price_suv: quoteMode.suv ? 0 : (Number(priceForm.suv) || 0),
          price_luxury: quoteMode.luxury ? 0 : (Number(priceForm.luxury) || 0),
        },
      });
      toast.success('Price updated');
      setEditingPrice(null);
      fetchServicePrices();
    } catch { toast.error('Failed to update price'); }
    setSavingPrice(false);
  };

  const [newCouponLimit, setNewCouponLimit] = useState('1');

  const addCoupon = async () => {
    if (!newCouponCode.trim()) { toast.error('Enter coupon code'); return; }
    if (!newCouponDiscount || Number(newCouponDiscount) <= 0 || Number(newCouponDiscount) > 100) { toast.error('Enter valid discount (1-100%)'); return; }
    setAddingCoupon(true);
    try {
      await adminAction({
        action: 'create-coupon',
        couponCode: newCouponCode,
        couponDiscount: newCouponDiscount,
        usageLimit: Number(newCouponLimit) || 1,
      });
      toast.success('Coupon created');
      setNewCouponCode('');
      setNewCouponDiscount('');
      fetchCoupons();
    } catch (e: any) { toast.error(e.message || 'Failed to add coupon'); }
    setAddingCoupon(false);
  };

  const toggleCoupon = async (id: string, active: boolean) => {
    try {
      await adminAction({ action: 'toggle-coupon', couponId: id, active });
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, active: !active } : c));
      toast.success(active ? 'Coupon deactivated' : 'Coupon activated');
    } catch { toast.error('Failed to update coupon'); }
  };

  const deleteCoupon = async (id: string) => {
    try {
      await adminAction({ action: 'delete-coupon', couponId: id });
      setCoupons(prev => prev.filter(c => c.id !== id));
      toast.success('Coupon deleted');
    } catch { toast.error('Failed to delete coupon'); }
  };

  const filteredBookings = bookings.filter(b => {
    const matchesFilter = filter === 'all' || b.status === filter;
    if (!matchesFilter) return false;
    if (!bookingSearch.trim()) return true;
    const q = bookingSearch.toLowerCase();
    return (b.service_name || '').toLowerCase().includes(q) ||
      (b.user_name || '').toLowerCase().includes(q) ||
      (b.user_email || '').toLowerCase().includes(q) ||
      (b.user_phone || '').toLowerCase().includes(q) ||
      (b.vehicle_number || '').toLowerCase().includes(q) ||
      (b.vehicle_make_model || '').toLowerCase().includes(q) ||
      (b.vehicle_type || '').toLowerCase().includes(q);
  });

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'Pending').length,
    confirmed: bookings.filter(b => b.status === 'Confirmed').length,
    completed: bookings.filter(b => b.status === 'Completed').length,
    rescheduled: bookings.filter(b => b.status === 'Rescheduled').length,
    cancelled: bookings.filter(b => b.status === 'Cancelled').length,
  };

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
  if (!user || !isAdmin) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Confirmed': return 'bg-green-100 text-green-700 border-green-200';
      case 'Completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Rescheduled': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusLabel = (booking: AdminBooking) => {
    if (booking.status === 'Confirmed' && booking.rescheduled_by) return 'Reschedule Confirmed';
    return booking.status;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white px-4 py-4 sticky top-0 z-20 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Admin Panel</h1>
            <p className="text-xs text-white/70">Urban Auto Garage</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowNotificationModal(true)} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors" title="Push Notification">
              <Bell className="w-5 h-5" />
            </button>
            <button onClick={() => setShowCarouselModal(true)} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors" title="Signup Carousel">
              <ImageIcon className="w-5 h-5" />
            </button>
            <button onClick={() => setShowPaymentModal(true)} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors" title="Payment Details">
              <QrCode className="w-5 h-5" />
            </button>
            <button onClick={() => setShowPasswordModal(true)} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors" title="Reset Password">
              <KeyRound className="w-5 h-5" />
            </button>
            <button onClick={() => {
              if (activeTab === 'bookings') fetchBookings();
              else if (activeTab === 'users') fetchProfiles();
              else if (activeTab === 'coupons') fetchCoupons();
              else fetchServicePrices();
            }} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={() => { setLoggingOut(true); logout().then(() => router.replace('/login')); }} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex border-b border-gray-200 bg-white sticky top-[72px] z-10">
        {(['bookings', 'users', 'services', 'coupons'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors ${activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-gray-500'}`}
          >
            {tab === 'bookings' && <CalendarDays className="w-4 h-4" />}
            {tab === 'users' && <Users className="w-4 h-4" />}
            {tab === 'services' && <Wrench className="w-4 h-4" />}
            {tab === 'coupons' && <Ticket className="w-4 h-4" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'bookings' && (
        <>
          <div className="px-4 py-4 grid grid-cols-6 gap-1">
            <button onClick={() => setFilter('all')} className={`p-2 rounded-xl text-center transition-all ${filter === 'all' ? 'bg-primary text-white shadow-md' : 'bg-white text-gray-700 shadow-sm'}`}>
              <p className="text-base font-bold">{stats.total}</p>
              <p className="text-[8px] font-medium">All</p>
            </button>
            <button onClick={() => setFilter('Pending')} className={`p-2 rounded-xl text-center transition-all ${filter === 'Pending' ? 'bg-yellow-500 text-white shadow-md' : 'bg-white text-gray-700 shadow-sm'}`}>
              <p className="text-base font-bold">{stats.pending}</p>
              <p className="text-[8px] font-medium">Pending</p>
            </button>
            <button onClick={() => setFilter('Rescheduled')} className={`p-2 rounded-xl text-center transition-all ${filter === 'Rescheduled' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-gray-700 shadow-sm'}`}>
              <p className="text-base font-bold">{stats.rescheduled}</p>
              <p className="text-[8px] font-medium">Resched.</p>
            </button>
            <button onClick={() => setFilter('Confirmed')} className={`p-2 rounded-xl text-center transition-all ${filter === 'Confirmed' ? 'bg-green-500 text-white shadow-md' : 'bg-white text-gray-700 shadow-sm'}`}>
              <p className="text-base font-bold">{stats.confirmed}</p>
              <p className="text-[8px] font-medium">Confirmed</p>
            </button>
            <button onClick={() => setFilter('Completed')} className={`p-2 rounded-xl text-center transition-all ${filter === 'Completed' ? 'bg-blue-500 text-white shadow-md' : 'bg-white text-gray-700 shadow-sm'}`}>
              <p className="text-base font-bold">{stats.completed}</p>
              <p className="text-[8px] font-medium">Done</p>
            </button>
            <button onClick={() => setFilter('Cancelled')} className={`p-2 rounded-xl text-center transition-all ${filter === 'Cancelled' ? 'bg-red-500 text-white shadow-md' : 'bg-white text-gray-700 shadow-sm'}`}>
              <p className="text-base font-bold">{stats.cancelled}</p>
              <p className="text-[8px] font-medium">Canc.</p>
            </button>
          </div>

          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={bookingSearch} onChange={(e) => setBookingSearch(e.target.value)} placeholder="Search by name, service, vehicle..." className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
              {bookingSearch && (
                <button onClick={() => setBookingSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
          </div>

          <div className="px-4 pb-8 space-y-3">
            {loadingBookings ? (
              <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-16"><p className="text-gray-500 text-sm">No bookings found</p></div>
            ) : (
              filteredBookings.map((booking) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${booking.status === 'Rescheduled' ? 'border-orange-300 ring-1 ring-orange-200' : 'border-gray-100'}`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 cursor-pointer" onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 text-sm">{booking.service_name}</h3>
                          {booking.status === 'Rescheduled' && <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <User className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-600">{booking.user_name || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">{booking.preferred_date_time || new Date(booking.booking_date).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <IndianRupee className="w-3 h-3 text-gray-400" />
                          <span className="text-xs font-semibold text-gray-700">
                            {booking.total_amount > 0 ? `₹${booking.total_amount.toLocaleString('en-IN')}/-` : 'Get Quote'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${booking.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {booking.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={(e) => { e.stopPropagation(); copyBookingDetails(booking); }} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                          <Copy className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(booking.status)}`}>
                          {getStatusLabel(booking)}
                        </span>
                        <button onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}>
                          {expandedId === booking.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedId === booking.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2.5">
                          <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-primary/60" /><span className="text-xs text-gray-600">{booking.user_email || 'N/A'}</span></div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-primary/60" />
                            <a href={`tel:+91${booking.user_phone}`} className="text-xs text-primary font-bold hover:underline">
                              +91 {booking.user_phone || 'N/A'}
                            </a>
                          </div>
                          <div className="flex items-center gap-2"><Car className="w-3.5 h-3.5 text-primary/60" /><span className="text-xs text-gray-600">{booking.vehicle_type} {booking.vehicle_number && `- ${booking.vehicle_number}`}</span></div>
                          {booking.vehicle_make_model && (
                            <div className="flex items-center gap-2"><Car className="w-3.5 h-3.5 text-primary/60" /><span className="text-xs text-gray-600">Make/Model: {booking.vehicle_make_model}</span></div>
                          )}
                          {booking.service_mode && (
                            <div className="flex items-center gap-2">
                              {booking.service_mode === 'Home Service' ? <Home className="w-3.5 h-3.5 text-primary/60" /> : <Truck className="w-3.5 h-3.5 text-primary/60" />}
                              <span className="text-xs text-gray-600">{booking.service_mode}</span>
                            </div>
                          )}
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-primary/60 mt-0.5" />
                            <div className="flex-1">
                              <span className="text-xs text-gray-600">{booking.address || 'No address'}</span>
                              {booking.manual_location_link ? (
                                <a
                                  href={booking.manual_location_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="block mt-1 text-[10px] text-green-600 font-bold hover:underline flex items-center gap-1"
                                >
                                  <MapPin className="w-2.5 h-2.5" /> View Manual Location
                                </a>
                              ) : booking.location_coords && (
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${booking.location_coords.lat},${booking.location_coords.lng}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="block mt-1 text-[10px] text-primary font-bold hover:underline"
                                >
                                  View on Google Maps
                                </a>
                              )}
                            </div>
                          </div>
                          {booking.notes && <div className="flex items-start gap-2"><FileText className="w-3.5 h-3.5 text-primary/60 mt-0.5" /><span className="text-xs text-gray-600">{booking.notes}</span></div>}
                          <p className="text-[10px] text-gray-400">Booked: {new Date(booking.created_at).toLocaleString()}</p>

                          <div className="flex gap-2 pt-2">
                            {(booking.status === 'Pending' || booking.status === 'Rescheduled') && (
                              <button onClick={(e) => { e.stopPropagation(); updateBookingStatus(booking.id, 'Confirmed'); }} disabled={confirmingId === booking.id} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-green-700 transition-colors disabled:opacity-60">
                                {confirmingId === booking.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Confirm
                              </button>
                            )}
                            {booking.status === 'Confirmed' && (
                              <button onClick={(e) => { e.stopPropagation(); updateBookingStatus(booking.id, 'Completed'); }} disabled={confirmingId === booking.id} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-colors disabled:opacity-60">
                                {confirmingId === booking.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                Mark Completed
                              </button>
                            )}
                            {booking.status !== 'Completed' && (
                              <button onClick={(e) => { e.stopPropagation(); setRescheduleId(rescheduleId === booking.id ? null : booking.id); setRescheduleDate(''); setRescheduleTime(''); }} className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-orange-600 transition-colors">
                                <Calendar className="w-3.5 h-3.5" />
                                Reschedule
                              </button>
                            )}
                          </div>

                          {rescheduleId === booking.id && (
                            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl space-y-3">
                              <p className="text-xs font-bold text-orange-700">Select new date & time</p>
                              <div className="grid grid-cols-2 gap-2">
                                <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="px-3 py-2.5 rounded-xl border border-orange-200 bg-white text-sm outline-none focus:border-orange-400" />
                                <input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} className="px-3 py-2.5 rounded-xl border border-orange-200 bg-white text-sm outline-none focus:border-orange-400" />
                              </div>
                              <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); setRescheduleId(null); }} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold">Cancel</button>
                                <button onClick={(e) => { e.stopPropagation(); rescheduleBooking(booking.id); }} disabled={rescheduleLoading} className="flex-1 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60">
                                  {rescheduleLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                  Confirm Reschedule
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <div className="px-4 py-4 pb-8 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">{profiles.length} registered users</p>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search by name, email, phone..." className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
            {userSearch && (
              <button onClick={() => setUserSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          {loadingProfiles ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-16"><p className="text-gray-500 text-sm">No users found</p></div>
          ) : (
            profiles.filter(p => {
              if (!userSearch.trim()) return true;
              const q = userSearch.toLowerCase();
              return (p.full_name || '').toLowerCase().includes(q) ||
                (p.email || '').toLowerCase().includes(q) ||
                (p.phone || '').toLowerCase().includes(q) ||
                (p.city || '').toLowerCase().includes(q);
            }).map((profile) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => router.push(`/admin/users/${profile.id}`)}
                className={`bg-white rounded-2xl shadow-sm border overflow-hidden cursor-pointer active:scale-[0.98] transition-transform ${profile.blocked ? 'border-red-200 bg-red-50/30' : !profile.verified ? 'border-yellow-200' : 'border-gray-100'}`}
              >
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${profile.blocked ? 'bg-red-100' : profile.verified ? 'bg-green-100' : 'bg-yellow-100'}`}>
                      <span className={`text-sm font-bold ${profile.blocked ? 'text-red-600' : profile.verified ? 'text-green-600' : 'text-yellow-600'}`}>
                        {(profile.full_name || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-sm truncate">{profile.full_name || 'Unknown'}</h3>
                        {profile.blocked && <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[9px] font-bold rounded shrink-0">BLOCKED</span>}
                        {!profile.blocked && profile.verified && <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                        {!profile.blocked && !profile.verified && <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[9px] font-bold rounded shrink-0">UNVERIFIED</span>}
                      </div>
                      <p className="text-[10px] text-gray-400">Joined {new Date(profile.created_at).toLocaleDateString()}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-gray-400" /><span className="text-[11px] text-gray-500">{profile.phone ? `+91 ${profile.phone}` : 'N/A'}</span></div>
                    <div className="flex items-center gap-1.5"><IndianRupee className="w-3 h-3 text-green-600" /><span className="text-[11px] font-semibold text-green-700">₹{(profile.wallet_balance ?? 0).toLocaleString('en-IN')}</span></div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {activeTab === 'services' && (
        <div className="px-4 py-4 pb-8 space-y-3">
          <p className="text-sm text-gray-500 mb-2">{servicePrices.length} services</p>
          {loadingServices ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            servicePrices.map((sp) => (
              <div key={sp.service_id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900 text-sm">{sp.service_name}</h3>
                    {editingPrice === sp.service_id ? (
                      <div className="flex gap-2">
                        <button onClick={() => setEditingPrice(null)} className="px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-semibold text-gray-600">Cancel</button>
                        <button onClick={() => savePrice(sp.service_id)} disabled={savingPrice} className="px-3 py-1.5 bg-primary rounded-lg text-xs font-semibold text-white disabled:opacity-60 flex items-center gap-1">
                          {savingPrice && <Loader2 className="w-3 h-3 animate-spin" />} Save
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEditPrice(sp)} className="p-2 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                        <IndianRupee className="w-4 h-4 text-primary" />
                      </button>
                    )}
                  </div>

                  {editingPrice === sp.service_id ? (
                    <div className="grid grid-cols-2 gap-3">
                      {(['sedan', 'hatchback', 'suv', 'luxury'] as const).map(type => (
                        <div key={type}>
                          <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1 block">{type}</label>
                          <button type="button" onClick={() => setQuoteMode(prev => ({ ...prev, [type]: !prev[type] }))} className={`w-full mb-1.5 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors ${quoteMode[type] ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                            {quoteMode[type] ? 'Get Quote' : 'Set Price'}
                          </button>
                          {!quoteMode[type] && (
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                              <input type="number" value={priceForm[type]} onChange={(e) => setPriceForm(prev => ({ ...prev, [type]: e.target.value }))} className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-primary" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Sedan', value: sp.price_sedan },
                        { label: 'Hatchback', value: sp.price_hatchback },
                        { label: 'SUV', value: sp.price_suv },
                        { label: 'Luxury', value: sp.price_luxury },
                      ].map(item => (
                        <div key={item.label} className="text-center p-2 bg-gray-50 rounded-lg">
                          <p className="text-[9px] text-gray-500 font-medium">{item.label}</p>
                          <p className={`text-sm font-bold ${Number(item.value) > 0 ? 'text-gray-900' : 'text-amber-600'}`}>{Number(item.value) > 0 ? `₹${Number(item.value).toLocaleString('en-IN')}` : 'Get Quote'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'coupons' && (
        <div className="px-4 py-4 pb-8 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Create Global Coupon
            </h3>
            <div className="space-y-3">
              <input type="text" value={newCouponCode} onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())} placeholder="Coupon Code (e.g., SAVE20)" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-primary uppercase" />
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <input type="number" value={newCouponDiscount} onChange={(e) => setNewCouponDiscount(e.target.value)} placeholder="Discount %" min="1" max="100" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-primary pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
                <div className="relative">
                  <input type="number" value={newCouponLimit} onChange={(e) => setNewCouponLimit(e.target.value)} placeholder="Usage Limit" min="1" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-primary pr-12" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold uppercase">Uses</span>
                </div>
              </div>
              <button onClick={addCoupon} disabled={addingCoupon} className="w-full py-3 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2">
                {addingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Global Coupon
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-500">{coupons.length} coupons</p>

          {loadingCoupons ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-16"><p className="text-gray-500 text-sm">No coupons created yet</p></div>
          ) : (
            coupons.map((coupon) => (
              <motion.div
                key={coupon.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${coupon.active ? 'border-green-200' : 'border-gray-200 opacity-60'}`}
              >
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${coupon.active ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <Ticket className={`w-5 h-5 ${coupon.active ? 'text-green-600' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm tracking-wider">{coupon.code}</h4>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-[10px] text-gray-500">{coupon.discount_percent}% off {coupon.user_id ? '(User-specific)' : '(Global)'}</p>
                        <p className="text-[10px] font-bold text-primary">Limit: {coupon.usage_limit || 1} uses</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleCoupon(coupon.id, coupon.active)} className={`p-2 rounded-lg transition-colors ${coupon.active ? 'bg-green-100 hover:bg-green-200' : 'bg-gray-100 hover:bg-gray-200'}`}>
                      {coupon.active ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                    </button>
                    <button onClick={() => deleteCoupon(coupon.id)} className="p-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      <AnimatePresence>
        {showPasswordModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPasswordModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Reset Password</h3>
                <button onClick={() => setShowPasswordModal(false)} className="p-1"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">New Password</label>
                  <div className="relative">
                    <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 8 characters" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm pr-11" />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Confirm Password</label>
                  <input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="Re-enter new password" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm" />
                </div>
                <button onClick={handlePasswordReset} disabled={passwordLoading} className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {passwordLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNotificationModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowNotificationModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Send Push Notification</h3>
                <button onClick={() => setShowNotificationModal(false)} className="p-1"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Notification Title</label>
                  <input
                    type="text"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                    placeholder="Enter title"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Notification Content</label>
                  <textarea
                    value={notificationContent}
                    onChange={(e) => setNotificationContent(e.target.value)}
                    placeholder="Enter message content"
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm resize-none"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!notificationTitle.trim() || !notificationContent.trim()) {
                      toast.error('Please enter both title and content');
                      return;
                    }
                    setPushingNotification(true);
                    try {
                      await adminAction({
                        action: 'send-push-notification',
                        title: notificationTitle,
                        content: notificationContent
                      });
                      toast.success('Notification pushed to all users');
                      setShowNotificationModal(false);
                      setNotificationTitle('');
                      setNotificationContent('');
                    } catch (err: any) {
                      toast.error(err.message || 'Failed to push notification');
                    }
                    setPushingNotification(false);
                  }}
                  disabled={pushingNotification}
                  className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {pushingNotification ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                  {pushingNotification ? 'Sending...' : 'Send to Everyone'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showCarouselModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowCarouselModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl p-6 w-full max-w-md my-8" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Signup Carousel</h3>
                <button onClick={() => setShowCarouselModal(false)} className="p-1"><X className="w-5 h-5 text-gray-400" /></button>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Signup Carousel Images
                </h4>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input type="text" value={newCarouselUrl} onChange={(e) => setNewCarouselUrl(e.target.value)} placeholder="Image URL" className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none" />
                    <button
                      onClick={async () => {
                        if (!newCarouselUrl) return;
                        setUploading(true);
                        try {
                          const current = appConfig.signup_carousel?.images || [];
                          const updated = [...current, newCarouselUrl];
                          await adminAction({ action: 'update-app-config', key: 'signup_carousel', value: { images: updated } });
                          setNewCarouselUrl('');
                          fetchConfig();
                          toast.success('Image added');
                        } catch (err: any) {
                          toast.error(err.message || 'Failed to add image');
                        } finally {
                          setUploading(false);
                        }
                      }}
                      disabled={uploading}
                      className="p-2 bg-primary text-white rounded-xl disabled:opacity-60"
                    >
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={carouselFileRef}
                      className="hidden"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploading(true);
                        try {
                          const url = await uploadImage(file, 'carousel');
                          const current = appConfig.signup_carousel?.images || [];
                          const updated = [...current, url];
                          await adminAction({ action: 'update-app-config', key: 'signup_carousel', value: { images: updated } });
                          fetchConfig();
                          toast.success('Image uploaded and added');
                        } catch (err: any) {
                          toast.error(err.message || 'Upload failed');
                        } finally {
                          setUploading(false);
                          if (carouselFileRef.current) carouselFileRef.current.value = '';
                        }
                      }}
                    />
                    <button
                      onClick={() => carouselFileRef.current?.click()}
                      disabled={uploading}
                      className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors disabled:opacity-60"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Upload from Device
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(appConfig.signup_carousel?.images || []).map((img: string, i: number) => (
                    <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-gray-100 group">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={async () => {
                          const updated = (appConfig.signup_carousel.images as string[]).filter((_, idx) => idx !== i);
                          await adminAction({ action: 'update-app-config', key: 'signup_carousel', value: { images: updated } });
                          fetchConfig();
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPaymentModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowPaymentModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl p-6 w-full max-w-md my-8" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Payment Details</h3>
                <button onClick={() => setShowPaymentModal(false)} className="p-1"><X className="w-5 h-5 text-gray-400" /></button>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <QrCode className="w-4 h-4" /> UPI & QR Config
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">UPI ID</label>
                    <input type="text" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="e.g. urbanauto@okaxis" className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none mt-1" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">QR Code Image URL</label>
                    <div className="flex gap-2 mt-1">
                      <input type="text" value={qrCodeUrl} onChange={(e) => setQrCodeUrl(e.target.value)} placeholder="Image URL" className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm outline-none" />
                      <input
                        type="file"
                        ref={qrFileRef}
                        className="hidden"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploading(true);
                          try {
                            const url = await uploadImage(file, 'payments');
                            setQrCodeUrl(url);
                            toast.success('QR Code uploaded');
                          } catch (err: any) {
                            toast.error(err.message || 'Upload failed');
                          } finally {
                            setUploading(false);
                            if (qrFileRef.current) qrFileRef.current.value = '';
                          }
                        }}
                      />
                      <button
                        onClick={() => qrFileRef.current?.click()}
                        disabled={uploading}
                        className="p-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-60"
                        title="Upload QR Code"
                      >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      setUploading(true);
                      try {
                        await adminAction({ action: 'update-app-config', key: 'payment_config', value: { upi_id: upiId, qr_code_url: qrCodeUrl } });
                        fetchConfig();
                        toast.success('Payment config updated');
                      } catch (err: any) {
                        toast.error(err.message || 'Update failed');
                      } finally {
                        setUploading(false);
                      }
                    }}
                    disabled={uploading}
                    className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Payment Config
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

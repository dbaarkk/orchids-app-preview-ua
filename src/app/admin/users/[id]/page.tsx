'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft, User, Phone, Mail, MapPin, Calendar, Loader2, IndianRupee,
  ShieldCheck, ShieldX, Ban, CheckCircle, KeyRound, Car, Home, Truck,
  FileText, AlertTriangle, Ticket, Plus, Trash2, ToggleLeft,
  ToggleRight, Eye, EyeOff, X, Clock, ArrowUpRight, ArrowDownLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

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
  display_id?: number;
  verified: boolean;
  blocked: boolean;
  wallet_balance: number;
  location_coords?: { lat: number; lng: number };
}

interface Booking {
  id: string;
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
  payment_status: string;
  payment_method: string;
  coupon_code: string | null;
  location_coords?: { lat: number; lng: number };
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  active: boolean;
  user_id: string | null;
  created_at: string;
}

async function adminFetch(resource: string, params?: Record<string, string>) {
  const query = new URLSearchParams({ resource, ...params });
  const res = await fetch(`/api/admin?${query}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
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

export default function UserDetailPage() {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  const [walletAmount, setWalletAmount] = useState('');
  const [walletDescription, setWalletDescription] = useState('');
  const [walletLoading, setWalletLoading] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState('');
  const [couponLimit, setCouponLimit] = useState('1');
  const [addingCoupon, setAddingCoupon] = useState(false);

  const [manualLocation, setManualLocation] = useState('');
  const [updatingLocation, setUpdatingLocation] = useState(false);

  useEffect(() => {
    if (profile?.manual_location_link) {
      setManualLocation(profile.manual_location_link);
    }
  }, [profile]);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && (!user || !isAdmin)) {
      router.replace('/login');
    }
  }, [isLoading, user, isAdmin, router]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [userDetail, couponsData] = await Promise.all([
        adminFetch('user-detail', { userId }),
        adminFetch('user-coupons', { userId }),
      ]);
      setProfile(userDetail.profile);
      setBookings(userDetail.bookings || []);
      setTransactions(userDetail.transactions || []);
      setCoupons(couponsData.data || []);
    } catch {
      toast.error('Failed to load user data');
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (isAdmin && userId) fetchAll();
  }, [isAdmin, userId, fetchAll]);

  const updateWalletBalance = async () => {
    if (!profile) return;
    const amount = Number(walletAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    setWalletLoading(true);
    try {
      const result = await adminAction({
        action: 'add-wallet-money',
        userId,
        amount,
        description: walletDescription.trim() || 'Balance added by admin',
      });
      setProfile(prev => prev ? { ...prev, wallet_balance: result.newBalance } : prev);
      setTransactions(prev => [{
        id: Date.now().toString(),
        amount,
        type: 'credit',
        description: walletDescription.trim() || 'Balance added by admin',
        created_at: new Date().toISOString(),
      }, ...prev]);
      toast.success(`₹${amount} added. New balance: ₹${result.newBalance}`);
      setWalletAmount('');
      setWalletDescription('');
    } catch {
      toast.error('Failed to update wallet');
    }
    setWalletLoading(false);
  };

  const addUserCoupon = async () => {
    if (!couponCode.trim()) { toast.error('Enter coupon code'); return; }
    if (!couponDiscount || Number(couponDiscount) <= 0 || Number(couponDiscount) > 100) { toast.error('Enter valid discount (1-100%)'); return; }
    setAddingCoupon(true);
    try {
      await adminAction({
        action: 'create-coupon',
        couponCode: couponCode.trim().toUpperCase(),
        couponDiscount,
        couponUserId: userId,
        usageLimit: Number(couponLimit) || 1,
      });
      toast.success('Coupon created');
      setCouponCode('');
      setCouponDiscount('');
      const fresh = await adminFetch('user-coupons', { userId });
      setCoupons(fresh.data || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed to add coupon');
    }
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

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      await adminAction({ action, userId });
      toast.success(action.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) + ' successful');
      const fresh = await adminFetch('user-detail', { userId });
      setProfile(fresh.profile);
    } catch { toast.error('Action failed'); }
    setActionLoading(null);
  };

  const updateManualLocation = async () => {
    setUpdatingLocation(true);
    try {
      await adminAction({ action: 'update-user-manual-location', userId, link: manualLocation });
      toast.success('Manual location updated');
      const fresh = await adminFetch('user-detail', { userId });
      setProfile(fresh.profile);
    } catch { toast.error('Failed to update location'); }
    setUpdatingLocation(false);
  };

  const handlePasswordReset = async () => {
    if (!newPassword || newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setPasswordLoading(true);
    try {
      await adminAction({ action: 'reset-password', userId, password: newPassword });
      toast.success('Password reset successfully');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch { toast.error('Failed to reset password'); }
    setPasswordLoading(false);
  };

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

  if (isLoading || loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
  if (!user || !isAdmin || !profile) return null;

  const totalSpent = bookings.filter(b => b.payment_status === 'paid').reduce((sum, b) => sum + (b.total_amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <header className="bg-primary text-white px-4 py-4 sticky top-0 z-20 shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">User Details</h1>
            <p className="text-xs text-white/70">{profile.full_name || 'Unknown User'}</p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${profile.blocked ? 'bg-red-100' : profile.verified ? 'bg-green-100' : 'bg-yellow-100'}`}>
              <span className={`text-2xl font-bold ${profile.blocked ? 'text-red-600' : profile.verified ? 'text-green-600' : 'text-yellow-600'}`}>
                {(profile.full_name || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">
                  {profile.full_name || 'Unknown'}
                  <span className="ml-2 text-[11px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                    ID = {profile.display_id ? String(profile.display_id).padStart(4, '0') : '----'}
                  </span>
                </h2>
                {profile.blocked && <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">BLOCKED</span>}
                {!profile.blocked && profile.verified && <ShieldCheck className="w-4 h-4 text-green-500" />}
                {!profile.blocked && !profile.verified && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full">UNVERIFIED</span>}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Joined {new Date(profile.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-primary/60" />
              <span className="text-sm text-gray-700">{profile.email || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-primary/60" />
              <span className="text-sm text-gray-700">{profile.phone ? `+91 ${profile.phone}` : 'N/A'}</span>
            </div>
            {(profile.address_line1 || profile.location_address) && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-primary/60 mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm text-gray-700">
                    {profile.location_address || [profile.address_line1, profile.address_line2, profile.city, profile.state, profile.pincode].filter(Boolean).join(', ')}
                  </span>
                  {profile.manual_location_link ? (
                    <a
                      href={profile.manual_location_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-1 text-[10px] text-green-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <MapPin className="w-2.5 h-2.5" /> View Manual Location
                    </a>
                  ) : profile.location_coords && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${profile.location_coords.lat},${profile.location_coords.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-1 text-[10px] text-primary font-bold hover:underline"
                    >
                      View on Google Maps
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <IndianRupee className="w-4 h-4 text-green-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-green-700">₹{(profile.wallet_balance ?? 0).toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-green-600 font-medium">Wallet</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <Calendar className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-blue-700">{bookings.length}</p>
              <p className="text-[10px] text-blue-600 font-medium">Bookings</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-xl">
              <IndianRupee className="w-4 h-4 text-purple-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-purple-700">₹{totalSpent.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-purple-600 font-medium">Total Spent</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={() => { setShowPasswordModal(true); setNewPassword(''); setConfirmPassword(''); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" /> Reset Password
            </button>
            {!profile.verified && !profile.blocked && (
              <button
                onClick={() => handleAction('verify-user')}
                disabled={actionLoading === 'verify-user'}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-100 rounded-lg text-xs font-semibold text-green-700 hover:bg-green-200 transition-colors disabled:opacity-60"
              >
                {actionLoading === 'verify-user' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />} Approve
              </button>
            )}
            {profile.verified && !profile.blocked && (
              <button
                onClick={() => handleAction('unverify-user')}
                disabled={actionLoading === 'unverify-user'}
                className="flex items-center gap-1.5 px-3 py-2 bg-yellow-100 rounded-lg text-xs font-semibold text-yellow-700 hover:bg-yellow-200 transition-colors disabled:opacity-60"
              >
                {actionLoading === 'unverify-user' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldX className="w-3.5 h-3.5" />} Revoke
              </button>
            )}
            {!profile.blocked ? (
              <button
                onClick={() => handleAction('block-user')}
                disabled={actionLoading === 'block-user'}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-100 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-200 transition-colors disabled:opacity-60"
              >
                {actionLoading === 'block-user' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />} Block
              </button>
            ) : (
              <button
                onClick={() => handleAction('unblock-user')}
                disabled={actionLoading === 'unblock-user'}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-100 rounded-lg text-xs font-semibold text-green-700 hover:bg-green-200 transition-colors disabled:opacity-60"
              >
                {actionLoading === 'unblock-user' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />} Unblock
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-green-600" />
            Add Money to Wallet
          </h3>
          <p className="text-xs text-gray-500 mb-3">Current balance: <span className="font-bold text-green-700">₹{(profile.wallet_balance ?? 0).toLocaleString('en-IN')}</span></p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input
                  type="number"
                  value={walletAmount}
                  onChange={(e) => setWalletAmount(e.target.value)}
                  placeholder="Amount"
                  min="1"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-green-400"
                />
              </div>
              <button
                onClick={updateWalletBalance}
                disabled={walletLoading}
                className="px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold disabled:opacity-60 flex items-center gap-1.5"
              >
                {walletLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add
              </button>
            </div>
            <input
              type="text"
              value={walletDescription}
              onChange={(e) => setWalletDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-green-400"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-600" />
            Update Manual Map Link
          </h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                placeholder="Paste Google Maps URL here"
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-green-400"
              />
              <button
                onClick={updateManualLocation}
                disabled={updatingLocation}
                className="px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold disabled:opacity-60 flex items-center gap-1.5"
              >
                {updatingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Update
              </button>
            </div>
            <p className="text-[10px] text-gray-400">This link will be shown in future bookings if Fetch Location is inaccurate.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Ticket className="w-4 h-4 text-purple-600" />
            Create Coupon for {profile.full_name || 'User'}
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Coupon Code"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-purple-400 uppercase"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input
                  type="number"
                  value={couponDiscount}
                  onChange={(e) => setCouponDiscount(e.target.value)}
                  placeholder="Discount %"
                  min="1"
                  max="100"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-purple-400 pr-7"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  value={couponLimit}
                  onChange={(e) => setCouponLimit(e.target.value)}
                  placeholder="Usage Limit"
                  min="1"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-purple-400 pr-10"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">USES</span>
              </div>
            </div>
            <button
              onClick={addUserCoupon}
              disabled={addingCoupon}
              className="w-full py-2.5 bg-purple-600 text-white rounded-xl text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {addingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Coupon
            </button>
          </div>

          {coupons.length > 0 && (
            <div className="mt-3 space-y-2 pt-3 border-t border-gray-100">
              {coupons.map(coupon => (
                <div key={coupon.id} className={`flex items-center justify-between p-3 rounded-xl ${coupon.active ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50 border border-gray-200 opacity-60'}`}>
                  <div>
                    <p className="text-xs font-bold text-gray-900 tracking-wider">{coupon.code}</p>
                    <p className="text-[10px] text-gray-500">{coupon.discount_percent}% off • Limit: {coupon.usage_limit || 1} uses</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => toggleCoupon(coupon.id, coupon.active)} className={`p-1.5 rounded-lg ${coupon.active ? 'bg-purple-100' : 'bg-gray-100'}`}>
                      {coupon.active ? <ToggleRight className="w-4 h-4 text-purple-600" /> : <ToggleLeft className="w-4 h-4 text-gray-400" />}
                    </button>
                    <button onClick={() => deleteCoupon(coupon.id)} className="p-1.5 rounded-lg bg-red-50">
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 px-1">
            <Calendar className="w-4 h-4 text-blue-600" />
            Booking History
            <span className="text-xs font-normal text-gray-400">({bookings.length})</span>
          </h3>
          {bookings.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No bookings yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map(booking => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${booking.status === 'Rescheduled' ? 'border-orange-300 ring-1 ring-orange-200' : 'border-gray-100'}`}
                >
                  <div className="p-4 cursor-pointer" onClick={() => setExpandedBooking(expandedBooking === booking.id ? null : booking.id)}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 text-sm">{booking.service_name}</h4>
                          {booking.status === 'Rescheduled' && <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Car className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-600">{booking.vehicle_type}{booking.vehicle_number ? ` - ${booking.vehicle_number}` : ''}</span>
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
                          {booking.payment_method && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-gray-100 text-gray-500 uppercase">{booking.payment_method}</span>
                          )}
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(booking.status)}`}>
                        {booking.status === 'Confirmed' && booking.rescheduled_by ? 'Rescheduled' : booking.status}
                      </span>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedBooking === booking.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
                          {booking.vehicle_make_model && (
                            <div className="flex items-center gap-2"><Car className="w-3.5 h-3.5 text-primary/60" /><span className="text-xs text-gray-600">{booking.vehicle_make_model}</span></div>
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
                              {profile.manual_location_link ? (
                                <a
                                  href={profile.manual_location_link}
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
                          {booking.coupon_code && (
                            <div className="flex items-center gap-2"><Ticket className="w-3.5 h-3.5 text-purple-500" /><span className="text-xs text-purple-600 font-medium">Coupon: {booking.coupon_code}</span></div>
                          )}
                          <p className="text-[10px] text-gray-400 pt-1">Booked: {new Date(booking.created_at).toLocaleString('en-IN')}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2 px-1">
            <Clock className="w-4 h-4 text-green-600" />
            Transaction History
            <span className="text-xs font-normal text-gray-400">({transactions.length})</span>
          </h3>
          {transactions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No transactions yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {transactions.map((tx, i) => (
                <div key={tx.id} className={`flex items-center gap-3 p-4 ${i !== transactions.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tx.type === 'credit' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {tx.type === 'credit' ? <ArrowDownLeft className="w-4 h-4 text-green-600" /> : <ArrowUpRight className="w-4 h-4 text-red-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{tx.description || (tx.type === 'credit' ? 'Money Added' : 'Payment')}</p>
                    <p className="text-[10px] text-gray-400">{new Date(tx.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</p>
                  </div>
                  <span className={`text-sm font-bold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                      {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-primary"
                  />
                </div>
                <button
                  onClick={handlePasswordReset}
                  disabled={passwordLoading}
                  className="w-full py-3 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {passwordLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Reset Password
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

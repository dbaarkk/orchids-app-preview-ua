'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { services } from '@/lib/services-data';
import { ArrowLeft, Loader2, Ticket, Check, X, Edit3, CreditCard, Clock, HelpCircle, Copy, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import AddressForm from '@/components/AddressForm';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface OfferCoupon {
  id: string;
  code: string;
  discount_percent: number;
  user_id: string | null;
}

export default function BookingSummaryPage() {
  const { user, isLoading, addBooking, updateAddress, refreshUser } = useAuth();
  const router = useRouter();

  const [summaryData, setSummaryData] = useState<any>(null);
  const [editingDetails, setEditingDetails] = useState(false);
  const [editName, setEditName] = useState('');
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_percent: number } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);
  const [showRazorpayPopup, setShowRazorpayPopup] = useState(false);
  const [showInsufficientPopup, setShowInsufficientPopup] = useState(false);

    const [offers, setOffers] = useState<OfferCoupon[]>([]);
    const [offersLoading, setOffersLoading] = useState(true);
    const offersRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }
    const stored = sessionStorage.getItem('bookingSummary');
    if (!stored) {
      router.replace('/booking');
      return;
    }
    setSummaryData(JSON.parse(stored));
  }, [isLoading, user, router]);

  useEffect(() => {
    if (user) {
      setEditName(user.name || '');
      fetchOffers();
    }
  }, [user?.id]);

  const fetchOffers = async () => {
    if (!user) return;
    setOffersLoading(true);
    try {
      const res = await fetch(`/api/coupons/offers?userId=${user.id}`);
      const data = await res.json();
      if (data.offers) setOffers(data.offers);
    } catch {}
    setOffersLoading(false);
  };

  const checkScroll = useCallback(() => {
    const el = offersRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = offersRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll);
    return () => el.removeEventListener('scroll', checkScroll);
  }, [offers, checkScroll]);

  const scrollOffers = (dir: 'left' | 'right') => {
    const el = offersRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  if (isLoading || !user || !summaryData) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const servicePrices: { id: string; name: string; price: number }[] = summaryData.selectedServices.map((id: string) => {
    const s = services.find(sv => sv.id === id);
    const price = summaryData.servicePrices?.[id] || s?.price || 0;
    return { id, name: s?.name || id, price };
  });

  const totalAmount = summaryData.totalAmount || 0;
  const discountAmount = appliedCoupon
    ? Math.round((totalAmount * appliedCoupon.discount_percent) / 100)
    : 0;
  const finalAmount = totalAmount - discountAmount;
    const walletBalance = user.walletBalance ?? 0;
  const canPayWithWallet = walletBalance >= finalAmount && finalAmount > 0;

  const handleApplyCoupon = async (code?: string) => {
    const codeToApply = code || couponCode.trim();
    if (!codeToApply) {
      toast.error('Enter a coupon code');
      return;
    }
    setCouponLoading(true);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToApply, userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Invalid coupon');
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon({ code: data.code, discount_percent: data.discount_percent });
        setCouponCode(data.code);
        toast.success(`Coupon applied! ${data.discount_percent}% off`);
      }
    } catch {
      toast.error('Failed to validate coupon');
    }
    setCouponLoading(false);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const handleAddressSave = async (address: any, coords?: { lat: number; lng: number }) => {
    const result = await updateAddress(address, coords);
    if (result.success) toast.success('Address saved!');
    else toast.error(result.error || 'Failed to save address');
    return result;
  };

  const handleSaveDetails = () => setEditingDetails(false);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => toast.success('Code copied!'));
    setCouponCode(code);
  };



  const submitBooking = async (paymentMethod: 'razorpay' | 'pay_later' | 'wallet') => {
    if (submitting || bookingDone) return;
    if (!user?.locationAddress) {
      toast.error('Please set your service address');
      return;
    }

    if (paymentMethod === 'razorpay') {
      setShowRazorpayPopup(true);
      return;
    }

      if (paymentMethod === 'wallet') {
        if (!canPayWithWallet) {
          setShowInsufficientPopup(true);
          return;
        }
        setSubmitting(true);
        try {
          const { data: freshProfile } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', user.id)
            .single();
          const freshBalance = freshProfile?.wallet_balance ?? 0;
          if (freshBalance < finalAmount) {
            setShowInsufficientPopup(true);
            setSubmitting(false);
            return;
          }

          const { error: walletError } = await supabase
            .from('profiles')
            .update({ wallet_balance: freshBalance - finalAmount })
            .eq('id', user.id);
          if (walletError) throw walletError;

          await supabase.from('wallet_transactions').insert([{
            user_id: user.id,
            amount: finalAmount,
            type: 'debit',
            description: `Payment for ${summaryData.serviceName}`,
          }]);

          const result = await addBooking({
            serviceName: summaryData.serviceName,
            vehicleType: summaryData.vehicleType,
            vehicleNumber: summaryData.vehicleNumber,
            vehicleMakeModel: summaryData.vehicleMakeModel,
            serviceMode: summaryData.serviceMode,
            address: user.locationAddress || '',
            locationCoords: user.locationCoords,
            preferredDateTime: `${summaryData.date} ${summaryData.time}`,
            notes: summaryData.notes,
            totalAmount: finalAmount,
            paymentMethod: 'wallet',
            paymentStatus: 'paid',
            couponCode: appliedCoupon?.code || null,
            discountAmount,
          });

          if (result.success) {
            setBookingDone(true);
            sessionStorage.removeItem('bookingSummary');
            await refreshUser();

            toast.success('Payment successful! Booking confirmed.');
            router.replace('/bookings');
          } else {
            await supabase.from('profiles').update({ wallet_balance: freshBalance }).eq('id', user.id);
            toast.error(result.error || 'Booking failed');
          }
        } catch {
          toast.error('Payment failed');
        } finally {
          setSubmitting(false);
        }
        return;
      }

    setSubmitting(true);
    try {
      const result = await addBooking({
        serviceName: summaryData.serviceName,
        vehicleType: summaryData.vehicleType,
        vehicleNumber: summaryData.vehicleNumber,
        vehicleMakeModel: summaryData.vehicleMakeModel,
        serviceMode: summaryData.serviceMode,
        address: user.locationAddress || '',
        locationCoords: user.locationCoords,
        preferredDateTime: `${summaryData.date} ${summaryData.time}`,
        notes: summaryData.notes,
        totalAmount: finalAmount,
        paymentMethod: 'pay_later',
        paymentStatus: 'unpaid',
        couponCode: appliedCoupon?.code || null,
        discountAmount,
      });

        if (result.success) {
          setBookingDone(true);
          sessionStorage.removeItem('bookingSummary');
          toast.success('Booking confirmed!');
          router.replace('/bookings');
      } else {
        toast.error(result.error || 'Failed to create booking');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mobile-container bg-gray-50 min-h-screen pb-10">
      <header className="bg-white px-4 py-4 flex items-center gap-4 border-b sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Checkout</h1>
      </header>

      <div className="px-4 py-4 space-y-4">

        {/* Payment Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <h3 className="text-sm font-bold text-gray-900 px-4 pt-4 pb-2">Payment Summary</h3>
          <div className="px-4 space-y-2.5 pb-2">
            {servicePrices.map((sp) => (
              <div key={sp.id} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{sp.name}</span>
                <span className="text-sm font-medium text-gray-900">
                  {sp.price > 0 ? `₹${sp.price.toLocaleString('en-IN')}` : 'Get Quote'}
                </span>
              </div>
            ))}
          </div>
          <div className="mx-4 mt-1 flex items-center justify-between text-[11px] text-gray-400 pb-2">
            <span>{summaryData.vehicleType} {summaryData.vehicleMakeModel && `- ${summaryData.vehicleMakeModel}`}</span>
            <span>{summaryData.date} {summaryData.time}</span>
          </div>
          {summaryData.vehicleNumber && (
            <div className="mx-4 pb-2 text-[11px] text-gray-400">
              {summaryData.vehicleNumber} | {summaryData.serviceMode}
            </div>
          )}
          {appliedCoupon && discountAmount > 0 && (
            <>
              <div className="mx-4 border-t border-dashed border-gray-200" />
              <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-sm text-green-600">Coupon ({appliedCoupon.code})</span>
                <span className="text-sm font-medium text-green-600">-₹{discountAmount.toLocaleString('en-IN')}</span>
              </div>
            </>
          )}
          <div className="mx-4 border-t border-dashed border-gray-200" />
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900">To be paid</span>
            <span className="text-base font-bold text-gray-900">
              {finalAmount > 0 ? `₹${finalAmount.toLocaleString('en-IN')}` : 'Get Quote'}
            </span>
          </div>
        </div>

        {/* User Details */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Your Details</h3>
            <button
              onClick={() => {
                if (editingDetails) handleSaveDetails();
                else setEditingDetails(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              {editingDetails ? <><Check className="w-3 h-3" /> Save</> : <><Edit3 className="w-3 h-3" /> Edit</>}
            </button>
          </div>

          {editingDetails ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Address</label>
                <div
                  onClick={() => setShowAddressForm(true)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm cursor-pointer min-h-[48px] flex items-center"
                >
                  {user.locationAddress ? (
                    <span className="text-gray-900">{user.locationAddress}</span>
                  ) : (
                    <span className="text-gray-400">Tap to set your address</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-900">{editName || user.name || 'Unknown'}</p>
              {user.locationAddress ? (
                <p className="text-xs text-gray-500">{user.locationAddress}</p>
              ) : (
                <button
                  onClick={() => { setEditingDetails(true); setShowAddressForm(true); }}
                  className="text-xs text-primary font-semibold"
                >
                  + Add Address
                </button>
              )}
            </div>
          )}
          <p className="text-[10px] text-amber-600 font-medium mt-2">Note: We are serviceable in Raipur only*</p>
        </div>

        {showAddressForm && (
          <AddressForm
            onSave={handleAddressSave}
            onClose={() => setShowAddressForm(false)}
            initialAddress={user?.address}
          />
        )}

        {/* Cancellation Note */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-3">
          <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center mt-0.5">
            <HelpCircle className="w-4 h-4 text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Cancellation fees applied</p>
            <p className="text-xs text-gray-500 mt-0.5">Cancellation charges may apply once the booking is confirmed. Please review our cancellation policy for details.</p>
          </div>
        </div>

        {/* Offers for you */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Offers for you</h3>
          {offersLoading ? (
            <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : offers.length === 0 ? (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-xs text-gray-400 text-center">No offers available right now</p>
            </div>
          ) : (
            <div className="relative">
              {canScrollLeft && (
                <button
                  onClick={() => scrollOffers('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white shadow-md rounded-full flex items-center justify-center border border-gray-200"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
              )}
              <div
                ref={offersRef}
                className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {offers.map((offer) => (
                  <div
                    key={offer.id}
                    className={`flex-shrink-0 w-[280px] snap-start bg-gradient-to-r ${
                      appliedCoupon?.code === offer.code
                        ? 'from-green-50 to-green-100 border-green-300'
                        : 'from-primary/5 to-primary/10 border-primary/20'
                    } rounded-2xl p-4 border relative overflow-hidden`}
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -mr-6 -mt-6" />
                    <div className="flex items-center gap-2 mb-2">
                      <Ticket className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold text-primary uppercase">{offer.user_id ? 'Just for you' : 'For everyone'}</span>
                    </div>
                    <p className="text-lg font-black text-gray-900 tracking-wider">{offer.code}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{offer.discount_percent}% off on your order</p>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => copyCode(offer.code)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                      {appliedCoupon?.code === offer.code ? (
                        <span className="flex items-center gap-1 px-3 py-1.5 bg-green-100 rounded-lg text-xs font-bold text-green-700">
                          <Check className="w-3 h-3" /> Applied
                        </span>
                      ) : (
                        <button
                          onClick={() => handleApplyCoupon(offer.code)}
                          disabled={couponLoading}
                          className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors disabled:opacity-60"
                        >
                          Apply
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {canScrollRight && (
                <button
                  onClick={() => scrollOffers('right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-white shadow-md rounded-full flex items-center justify-center border border-gray-200"
                >
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Coupon Input */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Ticket className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Apply a Coupon Code</h3>
          </div>

          {appliedCoupon ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <div>
                <p className="text-sm font-bold text-green-700">{appliedCoupon.code}</p>
                <p className="text-xs text-green-600">{appliedCoupon.discount_percent}% off applied</p>
              </div>
              <button onClick={removeCoupon} className="p-1.5 bg-green-100 rounded-lg hover:bg-green-200 transition-colors">
                <X className="w-4 h-4 text-green-700" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Enter coupon code"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-primary uppercase"
              />
              <button
                onClick={() => handleApplyCoupon()}
                disabled={couponLoading}
                className="px-5 py-3 bg-primary text-white rounded-xl text-sm font-bold disabled:opacity-60 flex items-center gap-1.5"
              >
                {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
              </button>
            </div>
          )}
        </div>

        {/* Payment Options */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Choose Payment Method</h3>

          <button
            onClick={() => submitBooking('razorpay')}
            disabled={submitting || bookingDone}
            className="w-full bg-[#072654] text-white py-4 rounded-xl font-semibold text-sm hover:bg-[#0a3270] transition-all disabled:opacity-60 flex items-center justify-center gap-3"
          >
            <CreditCard className="w-5 h-5" />
            Pay with Razorpay
          </button>

          <button
            onClick={() => submitBooking('pay_later')}
            disabled={submitting || bookingDone}
            className="w-full bg-white border-2 border-gray-200 text-gray-900 py-4 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-all disabled:opacity-60 flex items-center justify-center gap-3"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Clock className="w-5 h-5 text-gray-500" />
            )}
            Pay After Service Completion
          </button>

          <button
            onClick={() => submitBooking('wallet')}
            disabled={submitting || bookingDone}
            className={`w-full py-4 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-3 ${
              canPayWithWallet
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-100 text-gray-400 border-2 border-gray-200'
            }`}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wallet className="w-5 h-5" />
            )}
            Pay with Wallet (₹{walletBalance.toLocaleString('en-IN')})
          </button>
          {!canPayWithWallet && finalAmount > 0 && (
            <p className="text-[10px] text-red-500 text-center -mt-1">Balance too low. Please recharge your wallet.</p>
          )}
        </div>

        <div className="h-10" />
      </div>

      {/* Razorpay Popup */}
      <AnimatePresence>
        {showRazorpayPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowRazorpayPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Online Payments Unavailable</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">
                We are unable to process online payments at the moment. Please use wallet money or pay after service completion.
              </p>
              <button
                onClick={() => setShowRazorpayPopup(false)}
                className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* Insufficient Balance Popup */}
        <AnimatePresence>
          {showInsufficientPopup && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
              onClick={() => setShowInsufficientPopup(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-6 w-full max-w-sm text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Insufficient Balance</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-2">
                  Your wallet balance is <span className="font-bold text-gray-900">₹{walletBalance.toLocaleString('en-IN')}</span> but the service costs <span className="font-bold text-gray-900">₹{finalAmount.toLocaleString('en-IN')}</span>.
                </p>
                <p className="text-sm text-gray-500 leading-relaxed mb-5">
                  Please add money to your wallet or choose a different payment method.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => { setShowInsufficientPopup(false); router.push('/wallet/add-money'); }}
                    className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
                  >
                    Add Money
                  </button>
                  <button
                    onClick={() => setShowInsufficientPopup(false)}
                    className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
                  >
                    Choose Another Method
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
  
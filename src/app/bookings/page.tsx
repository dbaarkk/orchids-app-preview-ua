'use client';

import { useRouter } from 'next/navigation';
import { useAuth, Booking } from '@/lib/auth-context';
import { ArrowLeft, Calendar, Clock, MapPin, X, AlertCircle, Loader2, IndianRupee } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';

function RescheduleModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { rescheduleBooking } = useAuth();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!date || !time) {
      toast.error('Please select new date and time');
      return;
    }
    setLoading(true);
    const result = await rescheduleBooking(booking.id, `${date} ${time}`);
    if (result.success) {
      toast.success('Booking rescheduled successfully');
      onClose();
    } else {
      toast.error(result.error || 'Failed to reschedule');
      setLoading(false);
    }
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-6 w-full max-w-sm"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">Reschedule Booking</h3>
          <button onClick={onClose} className="p-1"><X size={20} /></button>
        </div>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">New Date</label>
            <input
              type="date"
              min={minDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1.5 block">New Time</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-primary text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Updating...' : 'Confirm Reschedule'}
        </button>
      </motion.div>
    </div>
  );
}

function BookingItem({ booking, onCancel, onReschedule }: { 
  booking: Booking; 
  onCancel: (id: string) => void;
  onReschedule: (booking: Booking) => void;
}) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const created = new Date(booking.createdAt).getTime();
      const now = new Date().getTime();
      const diff = 60 * 60 * 1000 - (now - created);
      return Math.max(0, diff);
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000 * 60);

    return () => clearInterval(interval);
  }, [booking.createdAt]);

  const minutesLeft = Math.floor(timeLeft / (1000 * 60));
  const canReschedule = timeLeft > 0 && (booking.status === 'Pending' || booking.status === 'Confirmed') && booking.status !== 'Cancelled';

  const isRescheduleConfirmed = booking.status === 'Confirmed' && booking.rescheduledBy !== null && booking.rescheduledBy !== undefined;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-700';
      case 'Confirmed': return 'bg-green-100 text-green-700';
      case 'Completed': return 'bg-blue-100 text-blue-700';
      case 'Rescheduled': return 'bg-orange-100 text-orange-700';
      case 'Cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 line-clamp-1">{booking.serviceName}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{booking.vehicleType}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(booking.status)}`}>
          {isRescheduleConfirmed ? 'Reschedule Confirmed' : booking.status}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar className="w-4 h-4 text-primary/60" />
          <span className="text-xs">{booking.preferredDateTime}</span>
        </div>
        <div className="flex items-start gap-2 text-gray-600">
          <MapPin className="w-4 h-4 text-primary/60 mt-0.5" />
          <span className="text-xs line-clamp-1">{booking.address}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <IndianRupee className="w-4 h-4 text-primary/60" />
          <span className="text-xs font-semibold text-gray-900">
            {(booking.totalAmount && booking.totalAmount > 0) ? `₹${booking.totalAmount.toLocaleString('en-IN')}/-` : 'Get Quote'}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${booking.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {booking.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
          </span>
        </div>
      </div>

      {canReschedule && (
        <div className="mt-4 p-3 bg-primary/5 rounded-xl border border-primary/10">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-semibold">Reschedule available for {minutesLeft} min</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onReschedule(booking)}
              className="flex-1 py-2 bg-primary text-white rounded-lg text-xs font-bold shadow-sm"
            >
              Reschedule
            </button>
            <button
              onClick={() => onCancel(booking.id)}
              className="flex-1 py-2 border border-gray-200 text-gray-500 rounded-lg text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {booking.status === 'Cancelled' && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-center">
          <p className="text-sm font-semibold text-red-600">
            Booking Cancelled
          </p>
        </div>
      )}

      {!canReschedule && booking.status === 'Pending' && (
        <button
          onClick={() => onCancel(booking.id)}
          className="mt-4 w-full py-2.5 border border-red-100 text-red-500 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors"
        >
          Cancel Booking
        </button>
      )}
    </motion.div>
  );
}

export default function BookingsPage() {
  const { user, isLoading, bookings, cancelBooking } = useAuth();
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [bookings]);

  const confirmCancel = async () => {
    if (!cancellingId) return;
    const id = cancellingId;
    setCancellingId(null);

    const result = await cancelBooking(id);

    if (result?.success) {
      toast.success('Booking cancelled');
    } else {
      toast.error(result?.error || 'Failed to cancel booking');
    }
  };

  if (isLoading && !user) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mobile-container bg-gray-50 min-h-screen pb-24">
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/home')} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">My Bookings</h1>
        </div>
      </header>

      <div className="px-4 py-4">
        {sortedBookings.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-10 h-10 text-gray-200" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">No bookings yet</h3>
            <p className="text-sm text-gray-500 mb-6 px-10">You haven't booked any service yet. Check out our services!</p>
            <button
              onClick={() => router.push('/home')}
              className="px-8 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-md shadow-primary/20"
            >
              Book Now
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedBookings.map((booking) => (
              <BookingItem 
                key={booking.id} 
                booking={booking} 
                onCancel={setCancellingId}
                onReschedule={setReschedulingBooking}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {cancellingId && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Cancel Booking?</h3>
              <p className="text-sm text-gray-500 text-center mb-6 px-2">
                This will cancel your scheduled service. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setCancellingId(null)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Keep It
                </button>
                <button
                  onClick={confirmCancel}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors"
                >
                  Confirm Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reschedulingBooking && (
          <RescheduleModal 
            booking={reschedulingBooking} 
            onClose={() => setReschedulingBooking(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

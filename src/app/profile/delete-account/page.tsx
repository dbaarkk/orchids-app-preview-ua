'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function DeleteAccountPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleDelete = async () => {
    if (confirmationText !== 'delete my account') {
      toast.error('Please type the confirmation text exactly');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/delete-account`,  {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete account');

      await logout();
      toast.success('Your account has been deleted permanently');
      router.replace('/login');
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong');
      setIsDeleting(false);
    }
  };

  return (
    <div className="mobile-container bg-white min-h-screen">
      <header className="bg-white px-4 py-4 flex items-center gap-4 border-b sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-900" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Delete Account</h1>
      </header>

      <div className="px-6 py-10">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-500" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Delete your account</h2>
        <p className="text-sm text-gray-500 text-center mb-10 leading-relaxed px-4">
          This action is permanent and cannot be undone. All your bookings, wallet balance, and profile data will be permanently wiped out from our systems.
        </p>

        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2 text-center">
              Type <span className="font-bold text-red-600 underline">delete my account</span> to delete your account
            </p>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value.toLowerCase())}
              placeholder="Type here..."
              className="w-full px-4 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-red-400 focus:ring-4 focus:ring-red-50/50 outline-none transition-all text-center text-sm font-semibold"
              disabled={isDeleting}
            />
          </div>

          <button
            onClick={handleDelete}
            disabled={confirmationText !== 'delete my account' || isDeleting}
            className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-200 active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none"
          >
            {isDeleting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Trash2 className="w-5 h-5" />
            )}
            {isDeleting ? 'Deleting your account...' : 'Delete Permanently'}
          </button>

          <button
            onClick={() => router.back()}
            disabled={isDeleting}
            className="w-full py-4 text-gray-500 font-bold text-sm hover:text-gray-700 transition-colors"
          >
            I've changed my mind
          </button>
        </div>
      </div>
    </div>
  );
}

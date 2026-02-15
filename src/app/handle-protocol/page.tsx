'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function ProtocolHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlParam = searchParams.get('url');

  useEffect(() => {
    if (urlParam) {
      try {
        const url = new URL(urlParam);
        const path = url.pathname || '';
        const host = url.host || '';
        const search = url.search || '';

        // Example protocols: 
        // web+urbanauto://booking?id=123 -> /bookings/123
        // web+urbanauto://service?name=carwash -> /services?search=carwash
        
        if (host === 'booking') {
          const id = new URLSearchParams(search).get('id');
          if (id) {
            router.replace(`/bookings/${id}`);
            return;
          }
        } else if (host === 'service') {
          const name = new URLSearchParams(search).get('name');
          if (name) {
            router.replace(`/services?search=${encodeURIComponent(name)}`);
            return;
          }
        }
      } catch (e) {
        console.error('Failed to parse protocol URL', e);
      }
    }
    
    // Fallback
    const timeout = setTimeout(() => {
      router.replace('/home');
    }, 1500);

    return () => clearTimeout(timeout);
  }, [urlParam, router]);

  return (
    <div className="mobile-container bg-white min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
      <h1 className="text-xl font-bold text-gray-900 mb-2">Handling Request</h1>
      <p className="text-gray-500">Please wait while we redirect you...</p>
    </div>
  );
}

export default function HandleProtocolPage() {
  return (
    <Suspense fallback={
      <div className="mobile-container bg-white min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
      </div>
    }>
      <ProtocolHandler />
    </Suspense>
  );
}

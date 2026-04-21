'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Loader2, Package as PackageIcon } from 'lucide-react';
import { services as appServices } from '@/lib/services-data';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface PackageData {
  id: string;
  name: string;
  price: number;
  service_allowances: Record<string, number>;
  active: boolean;
  image?: string;
}

export default function PackagesPage() {
  const router = useRouter();
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/admin/packages`);
      if (res.ok) {
        const data = await res.json();
        setPackages(data.filter((pkg: any) => pkg.active) || []);
      } else {
        throw new Error('Failed to load');
      }
    } catch (err: any) {
      console.error(err);
      // Suppress error toast if table just doesn't exist yet
    } finally {
      setLoading(false);
    }
  };

  const handleBook = (pkg: PackageData) => {
    // Save to booking draft
    const draft = {
      selectedServices: [],
      notes: `Booking Package: ${pkg.name} (₹${pkg.price})`,
      package_id: pkg.id,
      package_name: pkg.name,
      package_price: pkg.price
    };
    localStorage.setItem('ua_booking_draft', JSON.stringify(draft));
    router.push('/packages/checkout');
  };

  return (
    <div className="mobile-container bg-gray-50 min-h-screen pb-10">

      <header className="bg-white px-4 py-4 flex items-center justify-between border-b sticky top-0 z-10">
        <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <PackageIcon className="w-5 h-5 text-primary" />
              Service Packages
            </h1>
        </div>
        <button onClick={() => router.push('/packages/active')} className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors">
            Active Packages
        </button>
      </header>


      <main className="p-4 space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Plan</h2>
          <p className="text-sm text-gray-500">Premium care packages designed for your vehicle</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <PackageIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No packages available right now</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {packages.map((pkg) => (
              <div key={pkg.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col relative transition-all hover:shadow-md">
                <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{pkg.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-black text-primary">₹{pkg.price.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">What's Included</p>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {Object.entries(pkg.service_allowances || {}).map(([serviceId, count], idx) => {
                      const svc = appServices.find(s => s.id === serviceId);
                      return (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm font-bold text-gray-900">{count as number}x <span className="font-medium text-gray-700">{svc ? svc.name : serviceId}</span></span>
                        </li>
                      );
                    })}
                  </ul>

                  <button
                    onClick={() => handleBook(pkg)}
                    className="w-full py-3.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
                  >
                    Select Package
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Package, Clock, ShieldCheck, Car } from 'lucide-react';
import { services as appServices } from '@/lib/services-data';
import { motion } from 'framer-motion';

export default function ActivePackagesPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [packages, setPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);

  const getParsedAllowances = (allowances: any) => {
    if (typeof allowances === 'string') {
      try {
        return JSON.parse(allowances);
      } catch (e) {
        return allowances;
      }
    }
    return allowances;
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login?redirect=/packages/active');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const fetchPackages = async () => {
      if (!user) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/packages?userId=${user.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
             setPackages(data.packages);
          } else {
             // old format fallback if API returns array directly
             if (Array.isArray(data)) setPackages(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch packages', err);
      } finally {
        setLoadingPackages(false);
      }
    };
    fetchPackages();
  }, [user]);

  if (isLoading || loadingPackages) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white px-4 py-4 flex items-center shadow-sm sticky top-0 z-10">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-900" />
          </button>
          <h1 className="ml-2 font-bold text-lg text-gray-900">Active Packages</h1>
        </header>
        <div className="flex-1 flex justify-center items-center">
          <div className="w-8 h-8 border-4 border-hashtag-red border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col font-jakarta">
      <header className="bg-white px-4 py-4 flex items-center shadow-sm sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-900" />
        </button>
        <h1 className="ml-2 font-bold text-lg text-gray-900 font-syne">My Active Packages</h1>
      </header>

      <div className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full">
        {packages.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100 flex flex-col items-center">
             <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                 <Package className="w-8 h-8 text-gray-300" />
             </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">No Active Packages</h2>
            <p className="text-sm text-gray-500 mb-6">You don't have any active service packages at the moment.</p>
            <button
              onClick={() => router.push('/packages')}
              className="bg-gray-900 text-white px-6 py-2.5 rounded-full font-medium hover:bg-gray-800 transition-colors"
            >
              Browse Packages
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {packages.map((pkg, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                key={pkg.id}
                className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">{pkg.packages?.name || 'Service Package'}</h3>
                        {pkg.created_at || pkg.purchased_at && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" /> Purchased: {new Date(pkg.created_at || pkg.purchased_at).toLocaleDateString()}
                        </p>
                        )}
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs rounded-full font-bold ${pkg.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {pkg.status.toUpperCase()}
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                          <Car className="w-4 h-4" />
                          <span>Remaining Services</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-normal">Auto-updates on booking</span>
                  </h4>
                  <ul className="space-y-2">
                    {(() => {
                      const allowances = getParsedAllowances(pkg.remaining_allowances);
                      if (Array.isArray(allowances)) {
                        return allowances.map((serviceId: string, idx: number) => {
                          const serviceDef = appServices.find(s => s.id === serviceId);
                          const displayName = serviceDef ? serviceDef.name : serviceId;
                          return (
                            <li key={idx} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                              <span className="text-sm font-medium text-gray-700">{displayName}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded shadow-sm bg-white text-gray-900 border border-gray-200`}>
                                  1 left
                              </span>
                            </li>
                          );
                        });
                      } else {
                        return Object.entries(allowances || {}).map(([serviceId, count]: [string, any]) => {
                          const serviceDef = appServices.find(s => s.id === serviceId);
                          const displayName = serviceDef ? serviceDef.name : serviceId;
                          return (
                              <li key={serviceId} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                                <span className="text-sm font-medium text-gray-700">{displayName}</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded shadow-sm ${count > 0 ? 'bg-white text-gray-900 border border-gray-200' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                    {count as number} left
                                </span>
                              </li>
                          );
                        });
                      }
                    })()}
                  </ul>
                  {(!getParsedAllowances(pkg.remaining_allowances) || Object.keys(getParsedAllowances(pkg.remaining_allowances) || {}).length === 0) && (
                      <div className="text-sm text-gray-500 italic">
                        <p>No services found in this package.</p>
                      </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

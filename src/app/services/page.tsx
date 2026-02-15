'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { services, serviceCategories, getServicesByCategory, useLivePrices } from '@/lib/services-data';
import { ArrowLeft, Search, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect, Suspense } from 'react';
import { getAssetPath } from '@/lib/utils';

function ServicesContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get('category')
  );
  const { getPrice } = useLivePrices();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/signup');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="mobile-container bg-gray-50 min-h-screen safe-bottom">
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">All Services</h1>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search services..."
            className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-100 text-sm placeholder:text-gray-400 focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          />
        </div>

        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar -mx-4 px-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              !selectedCategory 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {serviceCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                selectedCategory === category.id 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-4">
        <p className="text-sm text-gray-500 mb-3">
          {filteredServices.length} services available
        </p>

        <div className="space-y-3">
          {filteredServices.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => router.push(`/booking?service=${service.id}`)}
              className="bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex">
                <div className="w-28 h-28 relative flex-shrink-0">
                    <Image
                      src={getAssetPath(service.image)}
                      alt={service.name}
                      fill
                      className="object-cover"
                    />

                </div>
                <div className="flex-1 p-3 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{service.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{service.subtitle}</p>
                  </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex flex-wrap gap-1">
                          {service.features.slice(0, 2).map((feature) => (
                            <span key={feature} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                              {feature}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-primary">
                              {(() => { const p = getPrice(service.id, service.price); if (p === null) return '...'; return p > 0 ? `₹${p.toLocaleString('en-IN')}` : service.priceLabel || 'Get Quote'; })()}
                            </span>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No services found</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={
      <div className="mobile-container flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ServicesContent />
    </Suspense>
  );
}

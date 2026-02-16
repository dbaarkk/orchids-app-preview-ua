'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { MapPin, Search, Sparkles, Wrench, Settings, ChevronRight, Phone } from 'lucide-react';
import { services, serviceCategories, useLivePrices } from '@/lib/services-data';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import AddressForm from '@/components/AddressForm';
import { toast } from 'sonner';
import { getAssetPath } from '@/lib/utils';

const categoryIcons: Record<string, React.ReactNode> = {
  wash: <Sparkles className="w-6 h-6" />,
  detailing: <Sparkles className="w-6 h-6" />,
  repair: <Wrench className="w-6 h-6" />,
  general: <Settings className="w-6 h-6" />,
};

export default function HomePage() {
  const { user, isLoading, isAdmin, updateAddress } = useAuth();
  const router = useRouter();
  const [showAddressForm, setShowAddressForm] = useState(false);
  const { getPrice } = useLivePrices();

    useEffect(() => {
      if (!isLoading && !user) {
        router.replace('/login');
      }
    }, [isLoading, user, router]);

    useEffect(() => {
      if (!isLoading && user && isAdmin) {
        router.replace('/admin');
      }
    }, [isLoading, user, isAdmin, router]);

  if (isLoading && !user) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const handleAddressSave = async (address: any) => {
    const result = await updateAddress(address);
    if (result.success) {
      toast.success('Address saved successfully!');
    } else {
      toast.error(result.error || 'Failed to save address');
    }
    return result;
  };

  const nearbyGarageServices = services.slice(0, 6);

  return (
    <div className="mobile-container bg-gray-50 min-h-screen safe-bottom">
      <header className="bg-primary px-4 pt-4 pb-6 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Image
              src={getAssetPath('/urban-auto-logo.jpg')}
              alt="Urban Auto"
              width={40}
              height={40}
              className="rounded-lg"
              priority
              unoptimized
            />

            <div>
              <h1 className="text-white font-bold text-lg leading-tight">URBAN AUTO</h1>
              <div 
                className="mt-1 flex items-center gap-1.5 px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white/90 text-[10px] font-medium cursor-pointer transition-all border border-white/10"
                onClick={() => setShowAddressForm(true)}
              >
                <MapPin className="w-3 h-3 text-white" />
                <span className="line-clamp-1 max-w-[150px]">
                  {user.locationAddress || 'Select Location'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href="tel:+918889822220"
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
            >
              <Phone className="w-5 h-5 text-white" />
            </a>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for services..."
            onClick={() => router.push('/services')}
            readOnly
            className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white text-sm placeholder:text-gray-400 cursor-pointer"
          />
        </div>
      </header>

      {showAddressForm && (
        <AddressForm
          onSave={handleAddressSave}
          onClose={() => setShowAddressForm(false)}
          initialAddress={user.address}
        />
      )}

      <div className="px-4 -mt-2">
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">Quick Services</h2>
          <div className="grid grid-cols-4 gap-3">
            {serviceCategories.map((category, index) => (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => router.push(`/services?category=${category.id}`)}
                className="flex flex-col items-center gap-2"
              >
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${category.color}15` }}
                >
                  <div style={{ color: category.color }}>
                    {categoryIcons[category.id] || categoryIcons['general']}
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                  {category.name}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900">About our garage</h2>
          <button 
            onClick={() => router.push('/services')}
            className="text-primary text-sm font-medium flex items-center gap-0.5"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <Image
                src={getAssetPath('/urban-auto-logo.jpg')}
                alt="Urban Auto Workshop"
                width={50}
                height={50}
                className="rounded-xl"
                unoptimized
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Urban Auto Workshop</h3>
                <p className="text-xs text-gray-500">Sunder Nagar, Raipur</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-green-600 font-medium">Open Now</span>
                  <span className="text-xs text-gray-400">9AM - 9PM</span>
                </div>
              </div>
              <button
                onClick={() => router.push('/services')}
                className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg"
              >
                Book
              </button>
            </div>
          </div>

          <div className="p-4">
            <h4 className="text-xs font-semibold text-gray-500 mb-3">ALL SERVICES</h4>
            <div className="grid grid-cols-2 gap-2">
              {nearbyGarageServices.map((service, index) => (
                <motion.button
                  key={service.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => router.push(`/booking?service=${service.id}`)}
                  className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="relative w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden">
                    <Image
                      src={getAssetPath(service.image)}
                      alt={service.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  <div className="flex-1 text-left">
                    <p className="text-xs font-medium text-gray-900 line-clamp-1">{service.name}</p>
                    <p className="text-[10px] text-gray-500 line-clamp-1">{service.subtitle}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6">
        <h2 className="text-base font-bold text-gray-900 mb-3">All Services</h2>
        <div className="space-y-3">
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => router.push(`/booking?service=${service.id}`)}
              className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="relative w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden">
                <Image
                  src={getAssetPath(service.image)}
                  alt={service.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm">{service.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-1">{service.subtitle}</p>
                    <p className="text-xs font-bold text-primary mt-0.5">
                        {(() => { const p = getPrice(service.id, service.price); if (p === null) return '...'; return p > 0 ? `₹${p.toLocaleString('en-IN')}` : service.priceLabel || 'Get Quote'; })()}
                      </p>
                </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </motion.div>
          ))}
        </div>
      </div>

      <div className="h-6" />
    </div>
  );
}

'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { services, HOME_SERVICE_IDS } from '@/lib/services-data';
import { ArrowLeft, Calendar, Car, FileText, Loader2, X, Plus, Home, Truck, ChevronRight } from 'lucide-react';
import { useState, useEffect, Suspense } from 'react';
import { toast } from 'sonner';
import { getAssetPath, cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const vehicleTypes = ['Sedan', 'Hatchback', 'SUV', 'Luxury'];

function BookingContent() {
  const { user, isLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const serviceId = searchParams.get('service');
    
    const [selectedServices, setSelectedServices] = useState<string[]>(serviceId ? [serviceId] : []);
    const [showServiceList, setShowServiceList] = useState(false);
    const [vehicleType, setVehicleType] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [vehicleMakeModel, setVehicleMakeModel] = useState('');
    const [serviceMode, setServiceMode] = useState<'Home Service' | 'Pickup & Drop'>('Pickup & Drop');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [notes, setNotes] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [dbPrices, setDbPrices] = useState<Record<string, any>>({});
    const [pricesLoaded, setPricesLoaded] = useState(false);

    useEffect(() => {
      if (!isLoading && !user) {
        router.replace('/login');
      }
    }, [isLoading, user, router]);

    useEffect(() => {
      let retries = 0;
      const fetchPrices = async () => {
        try {
          const { data, error } = await supabase.from('service_prices').select('*');
          if (error) throw error;
          if (data) {
            const map: Record<string, any> = {};
            data.forEach((row: any) => { map[row.service_id] = row; });
            setDbPrices(map);
            setPricesLoaded(true);
          }
        } catch {
          if (retries < 2) {
            retries++;
            setTimeout(fetchPrices, 1000);
          } else {
            setPricesLoaded(true);
          }
        }
      };
      fetchPrices();
    }, []);

    const getPrice = (serviceId: string) => {
        const priceRow = dbPrices[serviceId];
        if (!priceRow) return 0;
        const type = vehicleType || 'Hatchback';
        const key = `price_${type.toLowerCase()}`;
        return Number(priceRow[key]) || 0;
      };

    const getPriceLabel = (serviceId: string) => {
      if (!pricesLoaded) return '...';
      const price = getPrice(serviceId);
      const s = services.find(sv => sv.id === serviceId);
      if (price > 0) return `₹${price.toLocaleString('en-IN')}`;
      return s?.priceLabel || 'Get Quote';
    };

    const canHomeService = selectedServices.some(id => HOME_SERVICE_IDS.includes(id));

    useEffect(() => {
      if (!canHomeService && serviceMode === 'Home Service') {
        setServiceMode('Pickup & Drop');
      }
    }, [canHomeService, serviceMode]);

  const mainServiceId = serviceId || selectedServices[0];
  const mainService = services.find(s => s.id === mainServiceId);
  const additionalServices = selectedServices.filter(id => id !== mainServiceId);

  const toggleService = (id: string) => {
    if (id === mainServiceId) return;
    setSelectedServices(prev => 
      prev.includes(id) 
        ? prev.filter(s => s !== id) 
        : [...prev, id]
    );
  };

    const validate = () => {
      const newErrors: Record<string, string> = {};
      if (selectedServices.length === 0) newErrors.service = 'Please select at least one service';
      if (!vehicleType) newErrors.vehicleType = 'Please select vehicle type';
      if (!vehicleMakeModel.trim()) newErrors.vehicleMakeModel = 'Please enter vehicle make & model';
      if (!date) newErrors.date = 'Please select date';
      if (!time) newErrors.time = 'Please select time';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

    const totalAmount = selectedServices.reduce((sum, id) => sum + getPrice(id), 0);

    const handleProceed = () => {
      if (!pricesLoaded) {
        toast.error('Prices are still loading, please wait');
        return;
      }
      if (!validate()) {
        toast.error('Please fill all required fields');
        return;
      }

      const selectedServiceNames = selectedServices
        .map(id => services.find(s => s.id === id)?.name)
        .filter(Boolean)
        .join(', ');

    const summaryData = {
          selectedServices,
          serviceName: selectedServiceNames || mainService?.name || 'Car Service',
          vehicleType,
          vehicleNumber,
          vehicleMakeModel,
          serviceMode,
          date,
          time,
          notes,
          totalAmount,
          servicePrices: Object.fromEntries(selectedServices.map(id => [id, getPrice(id)])),
        };

      sessionStorage.setItem('bookingSummary', JSON.stringify(summaryData));
      router.push('/booking/summary');
    };

  if (isLoading || !user) {
    return (
      <div className="mobile-container flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mobile-container bg-gray-50 min-h-screen pb-10">
      <header className="bg-white px-4 py-4 flex items-center gap-4 border-b sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Book Service</h1>
      </header>

      <div className="px-4 py-4 space-y-4">
        {mainService && (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
            <div className="relative h-40 w-full">
              <Image
                src={getAssetPath(mainService.image)}
                alt={mainService.name}
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h2 className="text-white text-xl font-bold">{mainService.name}</h2>
                  <div className="flex items-center justify-between">
                    <p className="text-white/80 text-xs">{mainService.subtitle}</p>
                    <span className="text-white font-bold text-sm bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                      {getPriceLabel(mainService.id)}
                    </span>
                  </div>
                </div>
            </div>
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Service Features:</h3>
              <div className="flex flex-wrap gap-2">
                {mainService.features.map((f, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] rounded-md flex items-center gap-1">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {additionalServices.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Added Services</h3>
            {additionalServices.map(id => {
              const s = services.find(srv => srv.id === id);
              if (!s) return null;
              return (
                <div key={id} className="bg-white rounded-xl p-3 flex items-center justify-between shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden relative">
                        <Image src={getAssetPath(s.image)} alt={s.name} fill className="object-cover" unoptimized />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{s.name}</h4>
                        <p className="text-[10px] text-gray-500">{getPriceLabel(s.id)}</p>
                      </div>
                    </div>
                  <button 
                    onClick={() => toggleService(id)}
                    className="text-red-500 p-1 hover:bg-red-50 rounded-full"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div 
            onClick={() => setShowServiceList(!showServiceList)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex flex-col">
              <h3 className="font-semibold text-gray-900">Add More Services</h3>
              <p className="text-[10px] text-gray-500">Tap to view additional services</p>
            </div>
            <div className={cn("transition-transform duration-200", showServiceList ? "rotate-45" : "")}>
              <Plus className="w-5 h-5 text-primary" />
            </div>
          </div>
          
          {showServiceList && (
            <div className="grid grid-cols-2 gap-2 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
              {services.filter(s => s.id !== mainServiceId).map((s) => (
                <button
                  key={s.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleService(s.id);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedServices.includes(s.id)
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[10px] font-bold ${selectedServices.includes(s.id) ? 'text-primary' : 'text-gray-900'}`}>
                        {s.name}
                      </span>
                    </div>
                    <p className="text-[9px] font-semibold text-primary/80">
                      {getPriceLabel(s.id)}
                    </p>
                </button>
              ))}
            </div>
          )}
          {errors.service && <p className="text-red-500 text-xs mt-1">{errors.service}</p>}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" />
            Vehicle Details
          </h3>
          
          <label className="text-sm text-gray-600 mb-2 block">Vehicle Type *</label>
          <div className="flex flex-wrap gap-2 mb-4">
            {vehicleTypes.map((type) => (
              <button
                key={type}
                onClick={() => setVehicleType(type)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  vehicleType === type
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
          {errors.vehicleType && <p className="text-red-500 text-xs mb-3">{errors.vehicleType}</p>}

          <label className="text-sm text-gray-600 mb-1.5 block">Vehicle Make & Model *</label>
          <input
            type="text"
            value={vehicleMakeModel}
            onChange={(e) => setVehicleMakeModel(e.target.value)}
            placeholder="e.g., Maruti Swift, Hyundai Creta"
            className={`w-full px-4 py-3 rounded-xl border ${errors.vehicleMakeModel ? 'border-red-400' : 'border-gray-200'} bg-gray-50 text-sm outline-none mb-4`}
          />
          {errors.vehicleMakeModel && <p className="text-red-500 text-xs mb-3">{errors.vehicleMakeModel}</p>}

          <label className="text-sm text-gray-600 mb-1.5 block">Vehicle Number (Optional)</label>
          <input
            type="text"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
            placeholder="e.g., CG 04 AB 1234"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none"
          />
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />
            Service Mode
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setServiceMode('Pickup & Drop')}
              className={`p-3 rounded-xl border text-center transition-all ${
                serviceMode === 'Pickup & Drop'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <Truck className={`w-5 h-5 mx-auto mb-1 ${serviceMode === 'Pickup & Drop' ? 'text-primary' : 'text-gray-400'}`} />
              <p className={`text-xs font-semibold ${serviceMode === 'Pickup & Drop' ? 'text-primary' : 'text-gray-600'}`}>Pickup & Drop</p>
            </button>
            <button
              onClick={() => {
                if (canHomeService) setServiceMode('Home Service');
                else toast.error('Home service only for Car Wash, Interior & Exterior Cleaning');
              }}
              className={`p-3 rounded-xl border text-center transition-all ${
                serviceMode === 'Home Service'
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : canHomeService ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-gray-100 opacity-50'
              }`}
            >
              <Home className={`w-5 h-5 mx-auto mb-1 ${serviceMode === 'Home Service' ? 'text-primary' : 'text-gray-400'}`} />
              <p className={`text-xs font-semibold ${serviceMode === 'Home Service' ? 'text-primary' : 'text-gray-600'}`}>Home Service</p>
            </button>
          </div>
          {!canHomeService && (
            <p className="text-[10px] text-gray-400 mt-2">Home service is available only for Car Wash, Interior & Exterior Cleaning</p>
          )}
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
            Schedule Service
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1.5 block">Date *</label>
              <input
                type="date"
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border ${errors.date ? 'border-red-400' : 'border-gray-200'} bg-gray-50 text-sm outline-none`}
              />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1.5 block">Time *</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border ${errors.time ? 'border-red-400' : 'border-gray-200'} bg-gray-50 text-sm outline-none`}
              />
              {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time}</p>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Additional Notes (Optional)
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any specific requirements..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none resize-none"
          />
        </div>

          {selectedServices.length > 0 && vehicleType && (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">Total Amount</span>
                  {!pricesLoaded ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-gray-400">Loading prices...</span>
                    </div>
                  ) : (
                    <span className="text-lg font-bold text-primary">
                      {totalAmount > 0 ? `₹${totalAmount.toLocaleString('en-IN')}/-` : 'Get Quote'}
                    </span>
                  )}
                </div>
                {pricesLoaded && totalAmount > 0 && (
                  <p className="text-[10px] text-gray-400 mt-1">Payment to be collected after service</p>
                )}
              </div>
            )}

            <button
              onClick={handleProceed}
              className="w-full bg-primary text-white py-4 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              <ChevronRight className="w-4 h-4" />
              Proceed
            </button>
        <div className="h-20" />
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="mobile-container flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <BookingContent />
    </Suspense>
  );
}

'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { services, HOME_SERVICE_IDS } from '@/lib/services-data';
import { ArrowLeft, Calendar, Car, FileText, Loader2, X, Plus, Home, Truck, ChevronRight } from 'lucide-react';
import { useState, useEffect, Suspense, useCallback } from 'react';
import { toast } from 'sonner';
import { getAssetPath, cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const vehicleTypes = ['Sedan', 'Hatchback', 'SUV', 'Luxury'];

function BookingContent() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const serviceIdFromUrl = searchParams.get('service');

    const getISTDate = () => {
        return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    };

    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [showServiceList, setShowServiceList] = useState(false);
    const [vehicleType, setVehicleType] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [vehicleMakeModel, setVehicleMakeModel] = useState('');
    const [serviceMode, setServiceMode] = useState<'Home Service' | 'Pickup & Drop'>('Pickup & Drop');
    const [date, setDate] = useState(''); // Empty initial state to prevent hydration mismatch
    const [time, setTime] = useState('');
    const [notes, setNotes] = useState('');
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [disabledDates, setDisabledDates] = useState<string[]>([]);
    const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [dbPrices, setDbPrices] = useState<Record<string, any>>({});
    const [pricesLoaded, setPricesLoaded] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Set initial state from draft or user profile once mounted
    useEffect(() => {
        setMounted(true);
        const today = getISTDate();
        setDate(today);

        const draft = localStorage.getItem('ua_booking_draft');
        if (draft) {
            try {
                const data = JSON.parse(draft);
                if (data.selectedServices?.length) setSelectedServices(data.selectedServices);
                if (data.vehicleType) setVehicleType(data.vehicleType);
                if (data.vehicleNumber) setVehicleNumber(data.vehicleNumber);
                if (data.vehicleMakeModel) setVehicleMakeModel(data.vehicleMakeModel);
                if (data.serviceMode) setServiceMode(data.serviceMode);

                if (data.date && data.date >= today) {
                    setDate(data.date);
                    if (data.time) setTime(data.time);
                }
                if (data.notes) setNotes(data.notes);
            } catch (e) {
                console.error('Failed to parse draft', e);
            }
        } else if (user) {
            if (user.vehicleType) setVehicleType(user.vehicleType);
            if (user.vehicleNumber) setVehicleNumber(user.vehicleNumber);
            if (user.vehicleMakeModel) setVehicleMakeModel(user.vehicleMakeModel);
        }

        // URL service ID overrides if list is empty
        if (serviceIdFromUrl && selectedServices.length === 0) {
            setSelectedServices([serviceIdFromUrl]);
        }
    }, [user, serviceIdFromUrl]);

    // Update draft whenever fields change
    useEffect(() => {
        if (!mounted) return;
        const data = { selectedServices, vehicleType, vehicleNumber, vehicleMakeModel, serviceMode, date, time, notes };
        localStorage.setItem('ua_booking_draft', JSON.stringify(data));
    }, [selectedServices, vehicleType, vehicleNumber, vehicleMakeModel, serviceMode, date, time, notes, mounted]);

    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/login');
        }
    }, [isLoading, user, router]);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const { data, error } = await supabase.from('app_config').select('*').eq('key', 'booking_slots').single();
                if (!error && data?.value) {
                    if (data.value.slots) setAvailableSlots(data.value.slots);
                    if (data.value.disabled_dates) setDisabledDates(data.value.disabled_dates);
                }
            } catch {}
        };
        fetchConfig();

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
            } catch (e) {
                console.error('Fetch prices failed', e);
                setPricesLoaded(true);
            }
        };
        fetchPrices();
    }, []);

    const fetchOccupiedSlots = useCallback(async () => {
        if (!date) return;
        setLoadingSlots(true);
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('preferred_time')
                .in('status', ['Confirmed', 'Rescheduled', 'Completed'])
                .like('preferred_date_time', `${date}%`);

            if (!error && data) {
                setOccupiedSlots(data.map(b => b.preferred_time).filter(Boolean));
            }
        } catch {
        } finally {
            setLoadingSlots(false);
        }
    }, [date]);

    useEffect(() => {
        if (!mounted) return;
        fetchOccupiedSlots();

        const channel = supabase
            .channel('slots-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
                fetchOccupiedSlots();
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [date, fetchOccupiedSlots, mounted]);

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

    const toggleService = (id: string) => {
        setSelectedServices(prev =>
            prev.includes(id)
                ? (prev.length > 1 ? prev.filter(s => s !== id) : prev)
                : [...prev, id]
        );
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (selectedServices.length === 0) newErrors.service = 'Select at least one service';
        if (!vehicleType) newErrors.vehicleType = 'Select vehicle type';
        if (!vehicleMakeModel.trim()) newErrors.vehicleMakeModel = 'Enter vehicle model';
        if (!date) newErrors.date = 'Select date';
        else if (disabledDates.includes(date)) newErrors.date = 'This date is unavailable, please choose another';
        if (!time) newErrors.time = 'Select time';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const totalAmount = selectedServices.reduce((sum, id) => sum + getPrice(id), 0);

    const handleProceed = () => {
        if (!pricesLoaded) {
            toast.error('Loading prices, please wait...');
            return;
        }
        if (!validate()) {
            toast.error('Fill all required fields');
            return;
        }

        const selectedServiceNames = selectedServices
            .map(id => services.find(s => s.id === id)?.name)
            .filter(Boolean)
            .join(', ');

        const summaryData = {
            selectedServices,
            serviceName: selectedServiceNames || 'Car Service',
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

        localStorage.setItem('ua_booking_draft', JSON.stringify(summaryData));
        router.push('/booking/summary');
    };

    if (isLoading || !mounted) {
        return (
            <div className="mobile-container flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const mainServiceId = selectedServices[0] || serviceIdFromUrl;
    const mainService = services.find(s => s.id === mainServiceId);
    const otherSelectedServices = selectedServices.filter(id => id !== mainServiceId);

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
                            <Image src={getAssetPath(mainService.image)} alt={mainService.name} fill className="object-cover" unoptimized />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <div className="absolute bottom-4 left-4 right-4 text-white">
                                <h2 className="text-xl font-bold">{mainService.name}</h2>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="opacity-80">{mainService.subtitle}</span>
                                    <span className="font-bold bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                                        {getPriceLabel(mainService.id)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 flex flex-wrap gap-2">
                            {mainService.features.map((f, i) => (
                                <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] rounded-md">{f}</span>
                            ))}
                        </div>
                    </div>
                )}

                {otherSelectedServices.length > 0 && (
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Added Services</h3>
                        {otherSelectedServices.map(id => {
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
                                    <button onClick={() => toggleService(id)} className="text-red-500 p-1 hover:bg-red-50 rounded-full">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div onClick={() => setShowServiceList(!showServiceList)} className="flex items-center justify-between cursor-pointer">
                        <div>
                            <h3 className="font-semibold text-gray-900">Add More Services</h3>
                            <p className="text-[10px] text-gray-500">Tap to view additional services</p>
                        </div>
                        <Plus className={cn("w-5 h-5 text-primary transition-transform", showServiceList && "rotate-45")} />
                    </div>

                    {showServiceList && (
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            {services.filter(s => !selectedServices.includes(s.id)).map((s) => (
                                <button key={s.id} onClick={() => toggleService(s.id)} className="p-3 rounded-xl border text-left bg-gray-50 border-gray-100 hover:bg-gray-100 transition-all">
                                    <p className="text-[10px] font-bold text-gray-900">{s.name}</p>
                                    <p className="text-[9px] font-semibold text-primary/80">{getPriceLabel(s.id)}</p>
                                </button>
                            ))}
                        </div>
                    )}
                    {errors.service && <p className="text-red-500 text-xs mt-1">{errors.service}</p>}
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Car className="w-4 h-4 text-primary" /> Vehicle Details
                    </h3>

                    <div>
                        <p className="text-sm text-gray-600 mb-2">Vehicle Type *</p>
                        <div className="flex flex-wrap gap-2">
                            {vehicleTypes.map((type) => (
                                <button key={type} onClick={() => setVehicleType(type)} className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all", vehicleType === type ? "bg-primary text-white" : "bg-gray-100 text-gray-600")}>
                                    {type}
                                </button>
                            ))}
                        </div>
                        {errors.vehicleType && <p className="text-red-500 text-xs mt-1">{errors.vehicleType}</p>}
                    </div>

                    <div>
                        <p className="text-sm text-gray-600 mb-1.5">Vehicle Make & Model *</p>
                        <input type="text" value={vehicleMakeModel} onChange={(e) => setVehicleMakeModel(e.target.value)} placeholder="e.g., Maruti Swift" className={cn("w-full px-4 py-3 rounded-xl border bg-gray-50 text-sm outline-none", errors.vehicleMakeModel ? "border-red-400" : "border-gray-200")} />
                        {errors.vehicleMakeModel && <p className="text-red-500 text-xs mt-1">{errors.vehicleMakeModel}</p>}
                    </div>

                    <div>
                        <p className="text-sm text-gray-600 mb-1.5">Vehicle Number (Optional)</p>
                        <input type="text" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())} placeholder="e.g., CG 04 AB 1234" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-primary" /> Service Mode
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setServiceMode('Pickup & Drop')} className={cn("p-3 rounded-xl border transition-all", serviceMode === 'Pickup & Drop' ? "border-primary bg-primary/5 ring-1 ring-primary text-primary" : "border-gray-200 bg-gray-50 text-gray-600")}>
                            <Truck className="w-5 h-5 mx-auto mb-1" />
                            <p className="text-xs font-semibold">Pickup & Drop</p>
                        </button>
                        <button onClick={() => canHomeService ? setServiceMode('Home Service') : toast.error('Only available for Wash/Cleaning')} className={cn("p-3 rounded-xl border transition-all", serviceMode === 'Home Service' ? "border-primary bg-primary/5 ring-1 ring-primary text-primary" : "border-gray-200 bg-gray-50 text-gray-600", !canHomeService && "opacity-50 grayscale cursor-not-allowed")}>
                            <Home className="w-5 h-5 mx-auto mb-1" />
                            <p className="text-xs font-semibold">Home Service</p>
                        </button>
                    </div>
                    {!canHomeService && <p className="text-[10px] text-gray-400">Home service only for Car Wash, Interior & Exterior Cleaning</p>}
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm space-y-6">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" /> Schedule Service
                    </h3>

                    <div>
                        <p className="text-sm text-gray-600 mb-1.5">Select Date *</p>
                        <input
                          type="date"
                          value={date}
                          min={getISTDate()}
                          onChange={(e) => {
                            const picked = e.target.value;
                            if (disabledDates.includes(picked)) {
                              toast.error('This date is unavailable. Please choose another date.');
                              return;
                            }
                            setDate(picked);
                            setTime('');
                          }}
                          className={cn("w-full px-4 py-3 rounded-xl border bg-gray-50 text-sm outline-none", errors.date ? "border-red-400" : "border-gray-200")}
                        />
                        {disabledDates.includes(date) && (
                          <p className="text-orange-500 text-xs mt-1 font-medium">⚠ This date is unavailable. Please select another date.</p>
                        )}
                        {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
                    </div>

                    {date && !disabledDates.includes(date) && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-900">Available Slots</h4>
                            {loadingSlots ? (
                                <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                            ) : availableSlots.length === 0 ? (
                                <p className="text-center py-4 text-sm text-gray-400">No slots configured</p>
                            ) : (
                                <>
                                    {['Morning', 'Afternoon', 'Evening'].map(group => {
                                        const groupSlots = availableSlots.filter(s => {
                                            const h = parseInt(s.split(':')[0]);
                                            const isPm = s.toLowerCase().includes('pm');
                                            if (group === 'Morning') return !isPm && h < 12;
                                            if (group === 'Afternoon') return (isPm && (h === 12 || h < 4)) || (!isPm && h === 12);
                                            return isPm && h >= 4 && h !== 12;
                                        });
                                        if (groupSlots.length === 0) return null;
                                        return (
                                            <div key={group}>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 px-1">{group}</p>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {groupSlots.map(slot => {
                                                        const isOccupied = occupiedSlots.includes(slot);
                                                        return (
                                                            <button key={slot} disabled={isOccupied} onClick={() => setTime(slot)} className={cn("py-2.5 px-1 rounded-xl border text-[11px] font-bold transition-all", time === slot ? "border-primary bg-primary text-white shadow-md shadow-primary/20" : isOccupied ? "bg-gray-100 border-gray-100 text-gray-300 cursor-not-allowed" : "bg-white border-gray-100 text-gray-700")}>
                                                                {slot}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                            {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time}</p>}
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-primary" /> Additional Notes
                    </h3>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any specific requirements..." rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none resize-none" />
                </div>

                {selectedServices.length > 0 && vehicleType && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">Total Amount</span>
                        {!pricesLoaded ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <span className="text-lg font-bold text-primary">{totalAmount > 0 ? `₹${totalAmount.toLocaleString('en-IN')}/-` : 'Get Quote'}</span>}
                    </div>
                )}

                <button onClick={handleProceed} className="w-full bg-primary text-white py-4 rounded-xl font-semibold text-sm hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
                    <ChevronRight className="w-4 h-4" /> Proceed
                </button>
                <div className="h-10" />
            </div>
        </div>
    );
}

export default function BookingPage() {
    return (
        <Suspense fallback={<div className="mobile-container flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
            <BookingContent />
        </Suspense>
    );
}

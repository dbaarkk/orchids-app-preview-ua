export interface Service {
  id: string;
  name: string;
  subtitle: string;
  image: string;
  category: 'wash' | 'detailing' | 'repair' | 'general';
  features: string[];
  price: number;
  priceLabel?: string;
  homeServiceAvailable: boolean;
}

export const HOME_SERVICE_IDS = ['car-wash', 'interior-detailing', 'exterior-detailing'];

export const services: Service[] = [
    {
      id: 'car-wash',
      name: 'Car Wash',
      subtitle: 'Professional Cleaning Service At Home',
      image: '/car-wash.png',
      category: 'wash',
      features: ['Pressure Wash', 'Deep Vacuum', 'Mat Cleaning', 'Dashboard Polishing', 'Tire Shine'],
      price: 499,
      priceLabel: 'Starting at',
      homeServiceAvailable: true
    },
    {
      id: 'interior-detailing',
      name: 'Interior Detailing',
      subtitle: 'Complete Cabin Rejuvenation & Sanitization',
      image: '/interior-detailing.jpg',
      category: 'detailing',
      features: ['Deep Cleaning', 'Leather Treatment', 'Sanitization', 'Odor Removal', 'AC Vent Cleaning'],
      price: 2499,
      priceLabel: 'Starting at',
      homeServiceAvailable: true
    },
    {
      id: 'exterior-detailing',
      name: 'Exterior Detailing',
      subtitle: 'Unmatched Shine & Paint Protection',
      image: '/exterior-detailing.png',
      category: 'detailing',
      features: ['Paint Correction', 'Chrome Polishing', 'Wax Coating', 'Glass Treatment', 'Wheel Detailing'],
      price: 2999,
      priceLabel: 'Starting at',
      homeServiceAvailable: true
    },
    {
      id: 'periodic-service',
      name: 'Periodic Service',
      subtitle: 'Expert Maintenance for Peak Performance',
      image: '/periodic-service.png',
      category: 'general',
      features: ['Oil Change', 'Filter Replacement', 'Brake Inspection', 'Fluid Top-up', 'Multi-point Check'],
      price: 3999,
      priceLabel: 'Starting at',
      homeServiceAvailable: false
    },
    {
      id: 'denting-painting',
      name: 'Denting & Painting',
      subtitle: 'Precision Body Work & Factory Finish',
      image: '/denting-painting.jpg',
      category: 'repair',
      features: ['Dent Removal', 'Scratch Repair', 'Full Body Paint', 'Color Matching', 'Clear Coat'],
      price: 2999,
      priceLabel: 'Starting at',
      homeServiceAvailable: false
    },
    {
      id: 'suspension-fitments',
      name: 'Suspension & Fitments',
      subtitle: 'Smooth Handling & Ride Comfort',
      image: '/suspension.jpg',
      category: 'repair',
      features: ['Shock Absorbers', 'Strut Replacement', 'Alignment', 'Bushing Replacement', 'Spring Repair'],
      price: 1999,
      priceLabel: 'Starting at',
      homeServiceAvailable: false
    },
    {
      id: 'clutch-body-parts',
      name: 'Clutch & Body Parts',
      subtitle: 'Seamless Power Delivery & Component Replacement',
      image: '/clutch.jpg',
      category: 'repair',
      features: ['Clutch Plate', 'Pressure Plate', 'Flywheel Service', 'Body Panel Repair', 'Parts Replacement'],
      price: 3499,
      priceLabel: 'Starting at',
      homeServiceAvailable: false
    },
    {
      id: 'insurance-claims',
      name: 'Insurance Claims',
      subtitle: 'Hassle-Free Accident Recovery',
      image: '/insurance.png',
      category: 'general',
      features: ['Claim Processing', 'Documentation Help', 'Surveyor Coordination', 'Cashless Service', 'Quick Settlement'],
      price: 0,
      priceLabel: 'Get Quote',
      homeServiceAvailable: false
    },
    {
      id: 'roadside-assistance',
      name: 'Roadside Assistance',
      subtitle: 'Reliable Support Whenever You Need It',
      image: '/roadside.jpg',
      category: 'general',
      features: ['24/7 Support', 'Towing Service', 'Battery Jump Start', 'Flat Tire Help', 'Fuel Delivery'],
      price: 999,
      priceLabel: 'Starting at',
      homeServiceAvailable: false
    },
    {
      id: 'accidental-repair',
      name: 'Accidental Repair',
      subtitle: 'Major Collision Repair Specialists',
      image: '/accidental.jpg',
      category: 'repair',
      features: ['Frame Straightening', 'Panel Replacement', 'Structural Repair', 'Airbag Replacement', 'Full Restoration'],
      price: 0,
      priceLabel: 'Get Quote',
      homeServiceAvailable: false
    },
    {
      id: 'car-dealership',
      name: 'Car Dealership',
      subtitle: 'Buy & Sell Quality Pre-Owned Vehicles',
      image: '/car-dealership-hd.jpg',
      category: 'general',
      features: ['Verified Vehicles', 'Documentation Help', 'Fair Pricing', 'Inspection Report', 'Transfer Assistance'],
      price: 0,
      priceLabel: 'Contact Us',
      homeServiceAvailable: false
    }
];

export const serviceCategories = [
  { id: 'wash', name: 'Car Wash', icon: 'sparkles', color: '#10B981' },
  { id: 'detailing', name: 'Detailing', icon: 'sparkles', color: '#3B82F6' },
  { id: 'repair', name: 'Repairing', icon: 'wrench', color: '#F59E0B' },
  { id: 'general', name: 'General', icon: 'settings', color: '#8B5CF6' }
];

export const getServicesByCategory = (category: string) => {
  return services.filter(service => service.category === category);
};

export const getServiceById = (id: string) => {
  return services.find(service => service.id === id);
};

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

let cachedPrices: Record<string, number> | null = null;
let fetchPromise: Promise<void> | null = null;

function ensurePricesFetched(): Promise<void> {
  if (!fetchPromise) {
    fetchPromise = supabase
      .from('service_prices')
      .select('service_id, price_hatchback')
      .then(({ data }) => {
        if (data) {
          const map: Record<string, number> = {};
          data.forEach((row: any) => { map[row.service_id] = Number(row.price_hatchback) || 0; });
          cachedPrices = map;
        }
      }) as unknown as Promise<void>;
  }
  return fetchPromise!;
}

ensurePricesFetched();

export function useLivePrices() {
  const [prices, setPrices] = useState<Record<string, number>>(cachedPrices || {});
  const [loaded, setLoaded] = useState(!!cachedPrices);

  useEffect(() => {
    if (cachedPrices) {
      setPrices(cachedPrices);
      setLoaded(true);
      return;
    }
    ensurePricesFetched().then(() => {
      if (cachedPrices) {
        setPrices(cachedPrices);
        setLoaded(true);
      }
    });
  }, []);

  const getPrice = (serviceId: string, fallback: number) => {
    if (!loaded) return null;
    return prices[serviceId] ?? fallback;
  };

  return { prices, getPrice, loaded };
}

export function invalidatePriceCache() {
  cachedPrices = null;
  fetchPromise = null;
}

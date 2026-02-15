'use client';

import { useState, useCallback } from 'react';
import { getAccurateLocation, AccurateLocation } from '@/lib/location';

export interface AddressData {
  display_name: string;
  road?: string;
  suburb?: string;
  city?: string;
  postcode?: string;
  lat: number;
  lon: number;
  accuracy: number;
}

export const useNativeLocation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accuracyWarning, setAccuracyWarning] = useState<string | null>(null);

  const reverseGeocode = async (lat: number, lon: number): Promise<Partial<AddressData>> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'UrbanAuto-App'
          }
        }
      );
      const data = await response.json();
      
      return {
        display_name: data.display_name,
        road: data.address.road,
        suburb: data.address.suburb || data.address.neighbourhood,
        city: data.address.city || data.address.town || data.address.village,
        postcode: data.address.postcode,
      };
    } catch (err) {
      console.error('Reverse geocoding failed', err);
      throw new Error('Failed to fetch address details');
    }
  };

  const getCurrentLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAccuracyWarning(null);

    try {
      const location = await getAccurateLocation();

      if (location.accuracy > 100) {
        setAccuracyWarning('Turn on High Accuracy/GPS for better results');
        setLoading(false);
        return null;
      }

      const addressDetails = await reverseGeocode(location.latitude, location.longitude);
      
      setLoading(false);
      return {
        ...addressDetails,
        lat: location.latitude,
        lon: location.longitude,
        accuracy: location.accuracy,
      } as AddressData;

    } catch (err: any) {
      setError(err.message || 'Failed to get location');
      setLoading(false);
      return null;
    }
  }, []);

  return { getCurrentLocation, loading, error, accuracyWarning };
};

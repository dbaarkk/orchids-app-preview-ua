import { Geolocation, Position } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export interface AccurateLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export const getAccurateLocation = async (): Promise<AccurateLocation> => {
  try {
    // Native (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      const permissions = await Geolocation.requestPermissions();

      if (permissions.location !== 'granted') {
        throw new Error('Location permission denied');
      }

      const position: Position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      };
    }

    // Web fallback
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported');
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => reject(new Error(err.message || 'Failed to get location')),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  } catch (err: any) {
    console.error('Location error:', err);
    throw new Error(err.message || 'Failed to fetch location');
  }
};

export const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<{
  line1: string;
  pincode: string;
  city: string;
  state: string;
}> => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) throw new Error('Google Maps API key missing');

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );

    const data = await res.json();

    if (data.status !== 'OK' || !data.results?.length) {
      console.warn('Geocode failed:', data);
      return {
        line1: '',
        pincode: '',
        city: 'Raipur',
        state: 'Chhattisgarh',
      };
    }

    const result = data.results[0];
    const comps = result.address_components || [];

    let house = '';
    let street = '';
    let area = '';
    let pincode = '';
    let city = 'Raipur';
    let state = 'Chhattisgarh';

    comps.forEach((c: any) => {
      if (c.types.includes('premise') || c.types.includes('subpremise')) house = c.long_name;
      else if (c.types.includes('route')) street = c.long_name;
      else if (c.types.includes('sublocality') || c.types.includes('sublocality_level_1')) area = c.long_name;
      else if (c.types.includes('postal_code')) pincode = c.long_name;
      else if (c.types.includes('locality')) city = c.long_name;
      else if (c.types.includes('administrative_area_level_1')) state = c.long_name;
    });

    // Primary line build
    let line1 = [house, street, area].filter(Boolean).join(', ');

    // Fallback if components empty → use formatted address
    if (!line1) {
      line1 = result.formatted_address || '';
    }

    return {
      line1,
      pincode: pincode || '',
      city,
      state,
    };
  } catch (err) {
    console.error('Reverse geocode error:', err);
    return {
      line1: '',
      pincode: '',
      city: 'Raipur',
      state: 'Chhattisgarh',
    };
  }
};

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
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/location/reverse-geocode?lat=${lat}&lng=${lng}`);
    const data = await res.json();

    if (data.status === 'ZERO_RESULTS') {
      console.warn('Geocode returned ZERO_RESULTS');
      return {
        line1: 'Location not found',
        pincode: '',
        city: 'Raipur',
        state: 'Chhattisgarh',
      };
    }

    if (data.status !== 'OK' || !data.results?.length) {
      console.warn('Geocode failed:', data);
      return {
        line1: 'Geocoding failed',
        pincode: '',
        city: 'Raipur',
        state: 'Chhattisgarh',
      };
    }

    const result = data.results[0];
    const comps = result.address_components || [];

    let house = '';
    let street = '';
    let sublocality = '';
    let neighborhood = '';
    let pincode = '';
    let city = 'Raipur';
    let state = 'Chhattisgarh';

    comps.forEach((c: any) => {
      const types = c.types || [];
      if (types.includes('premise') || types.includes('subpremise') || types.includes('room') || types.includes('floor')) {
        house = c.long_name;
      } else if (types.includes('route') || types.includes('street_address')) {
        street = c.long_name;
      } else if (types.includes('sublocality') || types.includes('sublocality_level_1') || types.includes('sublocality_level_2')) {
        sublocality = c.long_name;
      } else if (types.includes('neighborhood')) {
        neighborhood = c.long_name;
      } else if (types.includes('postal_code')) {
        pincode = c.long_name;
      } else if (types.includes('locality')) {
        city = c.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        state = c.long_name;
      }
    });

    // Fallback area if sublocality is empty
    const area = sublocality || neighborhood || '';

    // Primary line build
    let line1 = [house, street, area].filter(Boolean).join(', ');

    // Fallback: If house and street both missing OR if line1 is still empty, use formatted_address
    if ((!house && !street) || !line1) {
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
      line1: 'Error fetching location',
      pincode: '',
      city: 'Raipur',
      state: 'Chhattisgarh',
    };
  }
};

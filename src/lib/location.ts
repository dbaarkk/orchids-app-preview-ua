import { Geolocation, Position } from '@capacitor/geolocation';

export interface AccurateLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export const getAccurateLocation = async (): Promise<AccurateLocation> => {
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
};

export const reverseGeocode = async (lat: number, lng: number): Promise<{
  line1: string;
  pincode: string;
  city: string;
  state: string;
}> => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
  const data = await response.json();

  if (data.status !== 'OK') {
    throw new Error(data.error_message || 'Geocoding failed');
  }

  const result = data.results[0];
  let houseNumber = '';
  let street = '';
  let area = '';
  let pincode = '';
  let city = 'Raipur';
  let state = 'Chhattisgarh';

  result.address_components.forEach((comp: any) => {
    if (comp.types.includes('premise') || comp.types.includes('subpremise')) {
      houseNumber = comp.long_name;
    } else if (comp.types.includes('route')) {
      street = comp.long_name;
    } else if (comp.types.includes('sublocality_level_1') || comp.types.includes('sublocality')) {
      area = comp.long_name;
    } else if (comp.types.includes('postal_code')) {
      pincode = comp.long_name;
    } else if (comp.types.includes('locality')) {
      city = comp.long_name;
    } else if (comp.types.includes('administrative_area_level_1')) {
      state = comp.long_name;
    }
  });

  const line1 = [houseNumber, street, area].filter(Boolean).join(', ');

  return {
    line1,
    pincode,
    city,
    state
  };
};

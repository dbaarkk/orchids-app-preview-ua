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

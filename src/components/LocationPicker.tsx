'use client';

import { useEffect, useRef, useState } from 'react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { Button } from './ui/button';
import { MapPin, Search, X, Loader2 } from 'lucide-react';
import { Input } from './ui/input';

interface LocationPickerProps {
  onSelect: (address: string, coords: { lat: number; lng: number }) => void;
  onClose: () => void;
  initialCoords?: { lat: number; lng: number };
  initialAddress?: string;
}

// Raipur, Chhattisgarh coordinates
const RAIPUR_CENTER = { lat: 21.2514, lng: 81.6296 };
const RAIPUR_BOUNDS = {
  north: 21.40,
  south: 21.10,
  east: 81.80,
  west: 81.40,
};

export default function LocationPicker({ onSelect, onClose, initialCoords, initialAddress }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  
  const [address, setAddress] = useState(initialAddress || '');
  const [coords, setCoords] = useState(initialCoords || RAIPUR_CENTER);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setOptions({
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      v: 'weekly',
    });

    Promise.all([
      importLibrary('maps'),
      importLibrary('places'),
      importLibrary('marker')
    ]).then(async ([mapsLib, placesLib, markerLib]) => {
      if (!mapRef.current) return;

      try {
        const { Map } = mapsLib as google.maps.MapsLibrary;
        const { Autocomplete } = placesLib as google.maps.PlacesLibrary;
        const MarkerClass = (markerLib as any).Marker || google.maps.Marker;

        const map = new Map(mapRef.current, {
          center: coords,
          zoom: 15,
          mapId: 'DEMO_MAP_ID', // Optional but good for newer features
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          restriction: {
            latLngBounds: RAIPUR_BOUNDS,
            strictBounds: true,
          },
        });

        mapInstanceRef.current = map;

        const marker = new MarkerClass({
          position: coords,
          map: map,
          draggable: true,
          animation: (google.maps as any).Animation?.DROP
        });

        markerRef.current = marker;
        setIsMapLoaded(true);

        // Initialize Autocomplete
        if (searchInputRef.current) {
          const autocomplete = new Autocomplete(searchInputRef.current, {
            componentRestrictions: { country: 'in' },
            fields: ['formatted_address', 'geometry', 'name'],
            types: ['geocode', 'establishment'],
            bounds: RAIPUR_BOUNDS
          });

          autocomplete.bindTo('bounds', map);
          autocompleteRef.current = autocomplete;

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (!place.geometry || !place.geometry.location) return;

            const newCoords = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            };

            setCoords(newCoords);
            setAddress(place.formatted_address || place.name || '');
            setSearchQuery(place.formatted_address || place.name || '');

            map.setCenter(newCoords);
            map.setZoom(17);
            marker.setPosition(newCoords);
          });
        }

        // Marker drag events
        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (pos) {
            const newCoords = { lat: pos.lat(), lng: pos.lng() };
            setCoords(newCoords);
            performReverseGeocode(newCoords);
          }
        });

        // Map click events
        map.addListener('click', (e: any) => {
          if (e.latLng) {
            const newCoords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            marker.setPosition(newCoords);
            setCoords(newCoords);
            performReverseGeocode(newCoords);
          }
        });
      } catch (err) {
        console.error('Error initializing location picker details:', err);
      }
    }).catch(err => {
      console.error('Google Maps Load Error:', err);
    });

    return () => {
      // Cleanup if needed
    };
  }, []);

  const performReverseGeocode = async (c: { lat: number; lng: number }) => {
    try {
      const res = await fetch(`/api/location/reverse-geocode?lat=${c.lat}&lng=${c.lng}`);
      const data = await res.json();
      if (data.status === 'OK' && data.results && data.results[0]) {
        setAddress(data.results[0].formatted_address);
        setSearchQuery(data.results[0].formatted_address);
      }
    } catch (err) {
      console.error('Reverse geocode failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="p-4 flex items-center gap-3 bg-white border-b border-gray-100 shadow-sm">
        <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-500">
          <X className="w-6 h-6" />
        </Button>
        <div className="flex-1 relative">
          <Input 
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search city, colony, or landmark..."
            className="bg-gray-50 border-gray-200 text-gray-900 pl-10 h-11 rounded-xl focus:ring-primary/20 focus:border-primary transition-all"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      </div>

      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />
        {!isMapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-gray-500 font-medium">Loading Google Maps...</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-gray-100 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-start gap-3 mb-4">
          <div className="mt-1 p-2 bg-primary/10 rounded-lg">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-gray-900 font-bold text-base">Select Location</h3>
            <p className="text-gray-500 text-sm line-clamp-2 mt-0.5 leading-relaxed">
              {address || 'Move marker or search to select location'}
            </p>
          </div>
        </div>
        
        <Button 
          onClick={() => address && onSelect(address, coords)}
          disabled={!address}
          className="w-full bg-primary hover:bg-primary/90 text-white h-12 font-bold text-lg rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
        >
          Confirm Location
        </Button>
      </div>
    </div>
  );
}

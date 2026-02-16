'use client';

import { useEffect, useRef, useState } from 'react';
import { X, MapPin, Check, Loader2, Search } from 'lucide-react';

const RAIPUR_BOUNDS = {
  north: 21.40,
  south: 21.10,
  east: 81.80,
  west: 81.40,
};

interface MapSelectorProps {
  onSelect: (lat: number, lng: number) => void;
  onClose: () => void;
  initialCenter?: { lat: number; lng: number };
}

declare global {
  interface Window {
    google: any;
  }
}

export default function MapSelector({ onSelect, onClose, initialCenter }: MapSelectorProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    let map: google.maps.Map;
    let marker: google.maps.Marker;

    const waitForGoogle = () =>
      new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const interval = setInterval(() => {
          if (window.google && window.google.maps) {
            clearInterval(interval);
            resolve();
          } else if (attempts > 40) {
            clearInterval(interval);
            reject(new Error('Google Maps not available'));
          }
          attempts++;
        }, 250);
      });

    const loadScriptOnce = async () => {
      if (window.google?.maps) return;

      if (!document.querySelector('#google-maps-script')) {
        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      await waitForGoogle();
    };

    const initMap = async () => {
      try {
        await loadScriptOnce();

        if (!mapRef.current) return;

        const center = initialCenter || { lat: 21.2514, lng: 81.6296 };

        map = new google.maps.Map(mapRef.current, {
          center,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          restriction: {
            latLngBounds: RAIPUR_BOUNDS,
            strictBounds: false,
          },
        });

        marker = new google.maps.Marker({
          position: center,
          map,
          draggable: true,
        });

        setSelected(center);
        setLoading(false);

        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const coords = e.latLng.toJSON();
          marker.setPosition(coords);
          setSelected(coords);
        });

        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (!pos) return;
          setSelected({ lat: pos.lat(), lng: pos.lng() });
        });

        // Safe autocomplete
        if (searchInputRef.current && google.maps.places) {
          const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
            componentRestrictions: { country: 'in' },
            fields: ['formatted_address', 'geometry', 'name'],
            types: ['geocode'],
          });

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (!place.geometry || !place.geometry.location) return;

            const coords = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };

            marker.setPosition(coords);
            map.setCenter(coords);
            map.setZoom(17);
            setSelected(coords);
            setSearchQuery(place.formatted_address || place.name || '');
          });
        }
      } catch (err) {
        console.error('MAP CRASH:', err);
        setMapError('Failed to load map');
        setLoading(false);
      }
    };

    initMap();
  }, [initialCenter]);

  return (
    <div className="fixed inset-0 z-[120] bg-white flex flex-col">
      <div className="p-4 border-b flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
          <h2 className="font-bold">Select Location</h2>
        </div>

        <button
          disabled={!selected}
          onClick={() => selected && onSelect(selected.lat, selected.lng)}
          className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          Confirm
        </button>
      </div>

      {/* SEARCH */}
      <div className="p-3 border-b bg-white">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search address..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* MAP */}
      <div ref={mapRef} className="flex-1 bg-gray-50 flex items-center justify-center">
        {loading && !mapError && (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-gray-500">Loading map...</p>
          </div>
        )}

        {mapError && <p className="text-red-500 font-medium">{mapError}</p>}
      </div>

      <div className="p-4 border-t text-sm text-gray-600 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        Tap map or drag marker to select exact location.
      </div>
    </div>
  );
}

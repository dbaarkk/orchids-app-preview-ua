'use client';

import { useEffect, useRef, useState } from 'react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
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

export default function MapSelector({ onSelect, onClose, initialCenter }: MapSelectorProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setOptions({
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      v: 'weekly',
    });

    Promise.all([
      importLibrary('maps'),
      importLibrary('marker'),
      importLibrary('places'),
    ])
      .then(async ([mapsLib, markerLib, placesLib]) => {
        if (!mapRef.current) return;

        try {
          const { Map } = mapsLib as google.maps.MapsLibrary;
          const MarkerClass = google.maps.Marker; // Stable legacy marker

          const { Autocomplete } = placesLib as google.maps.PlacesLibrary;

          const center = initialCenter || { lat: 21.2514, lng: 81.6296 };

          const map = new Map(mapRef.current, {
            center,
            zoom: 15,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });

          const marker = new MarkerClass({
            position: center,
            map,
            draggable: true,
          });

          setSelected(center);
          setLoading(false);

          map.addListener('click', (e: any) => {
            const coords = e.latLng?.toJSON();
            if (!coords) return;
            marker.setPosition(coords);
            setSelected(coords);
          });

          marker.addListener('dragend', () => {
            const coords = marker.getPosition()?.toJSON();
            if (coords) setSelected(coords);
          });

          // Safe Autocomplete (won't crash map)
          if (searchInputRef.current) {
            try {
              const autocomplete = new Autocomplete(searchInputRef.current, {
                componentRestrictions: { country: 'in' },
                fields: ['formatted_address', 'geometry', 'name'],
                types: ['geocode', 'establishment'],
              });

              autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                if (!place.geometry || !place.geometry.location) return;

                const newCoords = place.geometry.location.toJSON();
                setSelected(newCoords);
                map.setCenter(newCoords);
                map.setZoom(17);
                marker.setPosition(newCoords);
                setSearchQuery(place.formatted_address || place.name || '');
              });
            } catch (err) {
              console.warn('Places failed — map still usable', err);
            }
          }
        } catch (err) {
          console.error('Map initialization error:', err);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Google Maps failed to load:', err);
        setLoading(false);
      });
  }, [initialCenter]);

  return (
    <div className="fixed inset-0 z-[110] bg-white flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b">
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
          <Check className="w-4 h-4" /> Confirm
        </button>
      </div>

      {/* Search */}
      <div className="p-3 bg-white border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search location..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>
      </div>

      {/* Map */}
      <div ref={mapRef} className="flex-1 bg-gray-50 flex items-center justify-center relative">
        {loading && (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-gray-500">Loading map...</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t text-sm text-gray-600 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        Drag marker or tap map to select accurate location.
      </div>
    </div>
  );
}

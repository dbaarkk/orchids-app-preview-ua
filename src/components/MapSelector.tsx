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

  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    setOptions({
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      v: 'weekly',
    });

    const timeout = setTimeout(() => {
      if (!selected && !mapError) {
        setMapError('Map taking too long to load. Please check your connection.');
      }
    }, 10000);

    Promise.all([
      importLibrary('maps'),
      importLibrary('marker'),
      importLibrary('places')
    ])
      .then(async ([mapsLib, markerLib, placesLib]) => {
        clearTimeout(timeout);
        if (!mapRef.current) return;

        try {
          const MapClass = (mapsLib as any).Map;
          const MarkerClass = (markerLib as any).Marker || (markerLib as any).AdvancedMarkerElement;
          const AutocompleteClass = (placesLib as any).Autocomplete;

          if (!MapClass || !MarkerClass) {
            throw new Error('Required Google Maps components failed to load');
          }

          const center = initialCenter || { lat: 21.2514, lng: 81.6296 };

          const map = new MapClass(mapRef.current, {
            center,
            zoom: 15,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            restriction: {
              latLngBounds: RAIPUR_BOUNDS,
              strictBounds: true,
            },
          });

          const marker = new MarkerClass({
            position: center,
            map,
            draggable: true,
          });

          setSelected(center);

          const updateMarkerPos = (pos: { lat: number; lng: number }) => {
            if (marker.setPosition) marker.setPosition(pos);
            else marker.position = pos;
          };

          const getMarkerPos = () => {
            if (marker.getPosition) {
              const p = marker.getPosition();
              return { lat: p.lat(), lng: p.lng() };
            }
            return marker.position;
          };

          map.addListener('click', (e: any) => {
            if (!e.latLng) return;
            const coords = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            updateMarkerPos(coords);
            setSelected(coords);
          });

          marker.addListener('dragend', () => {
            const coords = getMarkerPos();
            if (coords) setSelected(coords);
          });

          // Autocomplete
          if (searchInputRef.current && AutocompleteClass) {
            const autocomplete = new AutocompleteClass(searchInputRef.current, {
              componentRestrictions: { country: 'in' },
              fields: ['formatted_address', 'geometry', 'name'],
              types: ['geocode', 'establishment'],
              bounds: RAIPUR_BOUNDS
            });

            autocomplete.addListener('place_changed', () => {
              const place = autocomplete.getPlace();
              if (!place.geometry || !place.geometry.location) return;

              const newCoords = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              };
              setSelected(newCoords);
              map.setCenter(newCoords);
              map.setZoom(17);
              marker.setPosition(newCoords);
              setSearchQuery(place.formatted_address || place.name || '');
            });
          }
        } catch (err) {
          console.error('Error initializing map details:', err);
          setMapError('Something went wrong initializing the map. Please try again.');
        }
      })
      .catch((err) => {
        clearTimeout(timeout);
        console.error('Google Maps failed:', err);
        setMapError('Failed to load Google Maps. Please try again later.');
      });
  }, [initialCenter]);

  return (
    <div className="fixed inset-0 z-[110] bg-white flex flex-col">
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

      <div className="p-3 bg-white border-b sticky top-0 z-20">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search address in Raipur..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>
      </div>

      <div ref={mapRef} className="flex-1 bg-gray-50 flex items-center justify-center relative">
        {mapError && (
          <div className="absolute inset-0 z-10 bg-white/90 flex flex-col items-center justify-center p-6 text-center">
            <p className="text-red-500 font-medium mb-4">{mapError}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold"
            >
              Retry
            </button>
          </div>
        )}
        {!selected && !mapError && (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-gray-500">Loading map...</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t text-sm text-gray-600 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        Drag marker or tap map to select accurate location.
      </div>
    </div>
  );
}

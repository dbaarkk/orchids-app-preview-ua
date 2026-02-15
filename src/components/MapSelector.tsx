'use client';

import { useEffect, useRef, useState } from 'react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { X, MapPin, Check, Loader2 } from 'lucide-react';

interface MapSelectorProps {
  onSelect: (lat: number, lng: number) => void;
  onClose: () => void;
  initialCenter?: { lat: number; lng: number };
}

export default function MapSelector({ onSelect, onClose, initialCenter }: MapSelectorProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(null);

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
      importLibrary('marker')
    ])
      .then(() => {
        clearTimeout(timeout);
        if (!mapRef.current) return;

        const center = initialCenter || { lat: 21.2514, lng: 81.6296 };

        const map = new google.maps.Map(mapRef.current, {
          center,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        const marker = new google.maps.Marker({
          position: center,
          map,
          draggable: true,
        });

        setSelected(center);

        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          const coords = e.latLng?.toJSON();
          if (!coords) return;
          marker.setPosition(coords);
          setSelected(coords);
        });

        marker.addListener('dragend', () => {
          const coords = marker.getPosition()?.toJSON();
          if (coords) setSelected(coords);
        });
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

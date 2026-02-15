'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { X, MapPin, Check } from 'lucide-react';

interface MapSelectorProps {
  onSelect: (lat: number, lng: number) => void;
  onClose: () => void;
  initialCenter?: { lat: number; lng: number };
}

export default function MapSelector({ onSelect, onClose, initialCenter }: MapSelectorProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      version: 'weekly',
    });

    loader
      .load()
      .then(() => {
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
        console.error('Google Maps failed:', err);
        alert('Map failed to load. Check API key, billing, and restrictions.');
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

      <div ref={mapRef} className="flex-1" />

      <div className="p-4 border-t text-sm text-gray-600 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        Drag marker or tap map to select accurate location.
      </div>
    </div>
  );
}

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
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      version: 'weekly',
    });

    loader.load().then(() => {
      if (!mapRef.current) return;

      const center = initialCenter || { lat: 21.2514, lng: 81.6296 }; // Default to Raipur
      const newMap = new google.maps.Map(mapRef.current, {
        center,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      const newMarker = new google.maps.Marker({
        position: center,
        map: newMap,
        draggable: true,
      });

      setMap(newMap);
      setMarker(newMarker);
      setSelectedCoords(center);

      newMap.addListener('click', (e: google.maps.MapMouseEvent) => {
        const coords = e.latLng?.toJSON();
        if (coords) {
          newMarker.setPosition(coords);
          setSelectedCoords(coords);
        }
      });

      newMarker.addListener('dragend', () => {
        const coords = newMarker.getPosition()?.toJSON();
        if (coords) {
          setSelectedCoords(coords);
        }
      });
    });
  }, [initialCenter]);

  return (
    <div className="fixed inset-0 z-[110] bg-white flex flex-col">
      <div className="p-4 flex items-center justify-between bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-lg font-bold text-gray-900">Select Location</h2>
        </div>
        <button
          onClick={() => selectedCoords && onSelect(selectedCoords.lat, selectedCoords.lng)}
          className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
        >
          <Check className="w-4 h-4" /> Confirm
        </button>
      </div>

      <div ref={mapRef} className="flex-1" />

      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center gap-3 text-gray-600">
          <MapPin className="w-5 h-5 text-primary" />
          <p className="text-sm">Drag the marker or click on the map to select your accurate location.</p>
        </div>
      </div>
    </div>
  );
}

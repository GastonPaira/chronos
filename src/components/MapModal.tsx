import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import type { Map as LeafletMap } from 'leaflet';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function MapModal({ isOpen, onClose }: Props) {
  const { locale } = useRouter();
  const mapDivRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !mapDivRef.current) return;

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    let map: LeafletMap;
    import('leaflet').then(L => {
      if (!mapDivRef.current) return;
      map = L.map(mapDivRef.current, { center: [20, 10], zoom: 2, zoomControl: true });
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        }
      ).addTo(map);
      leafletMapRef.current = map;
    });

    return () => {
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-chronos-bg/95 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <span className="text-[15px] font-semibold text-[#f5a623]">
          {locale === 'es' ? 'Explorar el mapa' : 'Explore the map'}
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded text-chronos-muted hover:text-chronos-gold transition-colors text-xl leading-none"
        >
          ×
        </button>
      </div>
      <div ref={mapDivRef} className="flex-1" />
    </div>
  );
}

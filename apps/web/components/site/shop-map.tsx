'use client';

// Display-only map of the shop for /contact. Same tiles as MapPicker (OSM until the Neshan key arrives, architecture §3.7);
// an iframe embed of openstreetmap.org needs WebGL and showed an error page in some browsers.
import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap } from 'leaflet';
import { useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Icon } from '@/components/icon';

export function ShopMap({ lat, lon }: { lat: number; lon: number }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: LeafletMap | undefined;
    let ro: ResizeObserver | undefined;
    let disposed = false;
    void import('leaflet').then((L) => {
      if (disposed || !el.current) return;
      map = L.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView([lat, lon], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
      // The same location icon the rest of the site uses; the tip of the pin sits on the coordinates.
      const pin = L.divIcon({
        className: '',
        html: renderToStaticMarkup(<Icon name="map-pin-filled" size={46} style={{ color: '#FF5B0F', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,.35))' }} />),
        iconSize: [46, 46],
        iconAnchor: [23, 44],
      });
      L.marker([lat, lon], { icon: pin, keyboard: false }).addTo(map);
      // The box animates in (scroll reveal) and changes size with the layout; keep the tiles aligned.
      ro = new ResizeObserver(() => map?.invalidateSize());
      ro.observe(el.current);
    });
    return () => { disposed = true; ro?.disconnect(); map?.remove(); };
  }, [lat, lon]);

  return <div ref={el} role="img" aria-label="نقشهٔ محل فروشگاه" className="hm-shopmap" style={{ position: 'absolute', inset: 0, background: '#EEE', zIndex: 0, isolation: 'isolate' }} />;
}

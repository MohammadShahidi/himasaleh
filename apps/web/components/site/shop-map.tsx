'use client';

// Display-only map of the shop for /contact. Same tiles as MapPicker (OSM until the Neshan key arrives, architecture §3.7);
// an iframe embed of openstreetmap.org needs WebGL and showed an error page in some browsers.
import 'leaflet/dist/leaflet.css';
import type { Map as LeafletMap } from 'leaflet';
import { useEffect, useRef } from 'react';

export function ShopMap({ lat, lon }: { lat: number; lon: number }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: LeafletMap | undefined;
    let disposed = false;
    void import('leaflet').then((L) => {
      if (disposed || !el.current) return;
      map = L.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView([lat, lon], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }).addTo(map);
      L.circleMarker([lat, lon], { radius: 11, color: '#fff', weight: 4, fillColor: '#FF5B0F', fillOpacity: 1 }).addTo(map);
    });
    return () => { disposed = true; map?.remove(); };
  }, [lat, lon]);

  return <div ref={el} role="img" aria-label="نقشهٔ محل فروشگاه" className="hm-shopmap" style={{ position: 'absolute', inset: 0, background: '#EEE' }} />;
}

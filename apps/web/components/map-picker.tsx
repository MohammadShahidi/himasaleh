'use client';

// Port of design/project/MapPicker.dc.html: fixed centre pin, drag the map under it,
// «جای من کجاست؟», search, zoom buttons, address under the map, «همین‌جاست، ثبت کن».
import 'leaflet/dist/leaflet.css';
import { toFaDigits } from '@hm/shared';
import type { Map as LeafletMap } from 'leaflet';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icon';
import { api } from '@/lib/api';

export interface PickedPlace { lat: number; lng: number; address: string }

// Map tiles: OpenStreetMap until the Neshan key arrives (architecture §3.7).
const TILES = { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap' };
const TEHRAN = { lat: 35.6997, lng: 51.338 };

const btnBase = { border: 'none', fontFamily: 'inherit' } as const;
const zoomBtn = { ...btnBase, width: 48, height: 48, borderRadius: 14, background: '#fff', color: '#141414', boxShadow: '0 6px 16px rgba(0,0,0,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' } as const;

export function MapPicker({
  lat, lng, height = 320, hint = 'نقشه را بکشید تا سوزن روی مکان شما بیفتد', confirmLabel = 'همین‌جاست، ثبت کن', onPick,
}: {
  lat?: number; lng?: number; height?: number; hint?: string; confirmLabel?: string; onPick?: (p: PickedPlace) => void;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const revT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ title: string; lat: number; lng: number }[]>([]);
  const [addr, setAddr] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoErr, setGeoErr] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);

  const reverse = (la: number, ln: number) => {
    clearTimeout(revT.current);
    setLoading(true);
    revT.current = setTimeout(async () => {
      try {
        const r = await api<{ address: string }>(`/geo/reverse?lat=${la}&lng=${ln}`);
        setAddr(r.address);
      } catch {
        setAddr('');
      } finally {
        setLoading(false);
      }
    }, 550);
  };

  useEffect(() => {
    let disposed = false;
    let ro: ResizeObserver | undefined;
    void import('leaflet').then((L) => {
      if (disposed || !mapEl.current) return;
      const start = lat != null && lng != null ? { lat, lng } : TEHRAN;
      const m = L.map(mapEl.current, { zoomControl: false, attributionControl: true }).setView([start.lat, start.lng], lat != null ? 17 : 12);
      L.tileLayer(TILES.url, { maxZoom: 19, attribution: TILES.attribution }).addTo(m);
      m.attributionControl.setPrefix(false);
      m.on('movestart', () => { if (pinRef.current) pinRef.current.style.transform = 'translateY(-14px)'; setConfirmed(false); });
      m.on('moveend', () => {
        if (pinRef.current) pinRef.current.style.transform = 'none';
        const c = m.getCenter();
        setCenter({ lat: c.lat, lng: c.lng });
        reverse(c.lat, c.lng);
      });
      map.current = m;
      setCenter(start);
      if (lat != null && lng != null) reverse(lat, lng);
      setTimeout(() => m.invalidateSize(), 250);
      ro = new ResizeObserver(() => m.invalidateSize());
      ro.observe(mapEl.current);
    });
    return () => { disposed = true; clearTimeout(revT.current); ro?.disconnect(); map.current?.remove(); map.current = null; };
    // The map is created once; later lat/lng prop changes must not reset what the user dragged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = async () => {
    const term = q.trim();
    if (term.length < 2) return;
    try {
      const r = await api<{ results: { title: string; lat: number; lng: number }[] }>(`/geo/search?q=${encodeURIComponent(term)}`);
      setResults(r.results);
    } catch {
      setResults([]);
    }
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); void search(); } };

  const locate = () => {
    if (!navigator.geolocation) return setGeoErr('گوشی شما موقعیت را پشتیبانی نمی‌کند.');
    setLocating(true); setGeoErr('');
    navigator.geolocation.getCurrentPosition(
      (p) => { setLocating(false); map.current?.flyTo([p.coords.latitude, p.coords.longitude], 17, { duration: 0.8 }); },
      () => { setLocating(false); setGeoErr('اجازه دسترسی به موقعیت داده نشد. نقشه را دستی بکشید.'); },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const confirm = () => {
    if (!center) return;
    setConfirmed(true);
    onPick?.({ lat: center.lat, lng: center.lng, address: addr });
  };

  const addrText = loading ? 'در حال پیدا کردن آدرس…'
    : addr || (center ? `${toFaDigits(center.lat.toFixed(5))}، ${toFaDigits(center.lng.toFixed(5))}` : 'مکان را روی نقشه انتخاب کنید');

  return (
    <div dir="rtl">
      <div style={{ position: 'relative' }}>
        <Icon name="search" size={20} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="جستجوی محله یا خیابان…"
          style={{ width: '100%', height: 54, border: '1.5px solid #E2E2E2', background: '#fff', borderRadius: 16, padding: '0 48px 0 96px', fontSize: 16, color: '#141414', outline: 'none' }} />
        <button data-mp-btn="" onClick={search} style={{ ...btnBase, position: 'absolute', left: 6, top: 6, height: 42, borderRadius: 12, background: '#141414', color: '#fff', padding: '0 16px', fontSize: 15, fontWeight: 800 }}>پیدا کن</button>
        {results.length > 0 && (
          <div style={{ position: 'absolute', top: 60, right: 0, left: 0, zIndex: 1000, background: '#fff', borderRadius: 16, boxShadow: '0 18px 40px rgba(0,0,0,.18)', overflow: 'hidden' }}>
            {results.map((r) => (
              <div key={`${r.lat},${r.lng}`} data-mp-res="" role="button" tabIndex={0}
                onClick={() => { setResults([]); setQ(''); map.current?.flyTo([r.lat, r.lng], 17, { duration: 0.8 }); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid #F2F2F2', cursor: 'pointer', fontSize: 15, color: '#222', lineHeight: 1.7 }}>
                <Icon name="map-pin" size={20} style={{ color: '#FF5B0F' }} />{r.title}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ position: 'relative', marginTop: 10, height, borderRadius: 20, overflow: 'hidden', border: '1.5px solid #E2E2E2', background: '#EEE', touchAction: 'none' }}>
        <div ref={mapEl} dir="ltr" style={{ position: 'absolute', inset: 0 }} />
        <div style={{ position: 'absolute', left: '50%', top: '50%', zIndex: 500, pointerEvents: 'none', transform: 'translate(-50%,-100%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div data-mp-pin="" ref={pinRef} style={{ lineHeight: 1, filter: 'drop-shadow(0 6px 8px rgba(0,0,0,.3))', color: '#FF5B0F', display: 'flex' }}><Icon name="map-pin-filled" size={52} /></div>
        </div>
        <div style={{ position: 'absolute', left: '50%', top: '50%', zIndex: 499, pointerEvents: 'none', width: 16, height: 6, borderRadius: '50%', background: 'rgba(0,0,0,.3)', transform: 'translate(-50%,-50%)' }} />
        <div style={{ position: 'absolute', top: 12, right: 12, left: 12, zIndex: 600, pointerEvents: 'none', display: 'flex', justifyContent: 'center' }}>
          <span style={{ background: 'rgba(20,20,20,.82)', color: '#fff', borderRadius: 999, padding: '8px 14px', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}><Icon name="hand-finger" size={17} />{hint}</span>
        </div>
        <div style={{ position: 'absolute', left: 12, bottom: 12, zIndex: 600, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button data-mp-btn="" onClick={() => map.current?.zoomIn()} aria-label="بزرگ‌نمایی" style={zoomBtn}><Icon name="plus" size={22} /></button>
          <button data-mp-btn="" onClick={() => map.current?.zoomOut()} aria-label="کوچک‌نمایی" style={zoomBtn}><Icon name="minus" size={22} /></button>
        </div>
        <button data-mp-btn="" onClick={locate} style={{ ...btnBase, position: 'absolute', right: 12, bottom: 12, zIndex: 600, height: 56, borderRadius: 16, background: '#1E4FD8', color: '#fff', padding: '0 16px', fontSize: 16, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 10px 24px rgba(30,79,216,.35)', whiteSpace: 'nowrap' }}>
          <Icon name={locating ? 'loader-2' : 'current-location'} size={22} className={locating ? 'hm-spin' : undefined} />
          جای من کجاست؟
        </button>
      </div>
      {geoErr && (
        <div style={{ marginTop: 8, fontSize: 14, color: '#C8341E', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="alert-circle" size={17} />{geoErr}</div>
      )}

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12, background: '#F6F6F6', borderRadius: 16, padding: '14px 16px' }}>
        <Icon name={loading ? 'loader-2' : 'map-pin'} size={26} style={{ color: '#FF5B0F' }} className={loading ? 'hm-spin' : undefined} />
        <bdi style={{ fontSize: 16, fontWeight: 700, color: '#222', lineHeight: 1.8 }}>{addrText}</bdi>
      </div>
      <button data-mp-btn="" onClick={confirm} style={{ ...btnBase, marginTop: 10, width: '100%', height: 64, borderRadius: 18, background: confirmed ? '#178A48' : '#22A45D', color: '#fff', fontSize: 19, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 12px 26px rgba(34,164,93,.3)' }}>
        <Icon name={confirmed ? 'circle-check' : 'check'} size={26} />{confirmed ? 'مکان ثبت شد' : confirmLabel}
      </button>
    </div>
  );
}

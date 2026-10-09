// Port of design/project/WaybillCard.dc.html — «برگ حمل الکترونیکی».
import { Icon } from '@/components/icon';
import { Plate } from '@/components/plate';

export interface WaybillData {
  no: string;
  status: string;
  track: string;
  fromTitle: string;
  fromAddr: string;
  distance: string;
  toTitle: string;
  toAddr: string;
  rows: { k: string; v: string }[];
  driverName: string;
  vehicle: string;
  plate: { a: string; letter: string; b: string; region: string };
  notes: string[];
  /** Internal note; only staff ever receive it from the API. */
  adminNote?: string;
}

const section = { padding: '20px 24px', borderBottom: '1px dashed #EAEAEA' } as const;

export function WaybillCard({ data }: { data: WaybillData }) {
  return (
    <div dir="rtl" style={{ background: '#fff', border: '1px solid #EFEFEF', borderRadius: 22, overflow: 'hidden', boxShadow: '0 14px 40px rgba(0,0,0,.06)' }}>
      <div style={{ position: 'relative', background: '#141414', color: '#fff', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: -40, top: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,91,15,.35),transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 46, height: 46, borderRadius: 14, background: '#FF5B0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="file-invoice" size={24} /></span>
          <div>
            <div style={{ fontSize: 13, color: '#AAA', fontWeight: 600 }}>برگ حمل الکترونیکی</div>
            <div style={{ marginTop: 2, fontSize: 18, fontWeight: 900, letterSpacing: '.5px' }}>شماره <bdi dir="ltr">{data.no}</bdi></div>
          </div>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.14)', borderRadius: 999, padding: '6px 12px', fontSize: 13, fontWeight: 700 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5B0F', boxShadow: '0 0 0 4px rgba(255,91,15,.25)' }} />{data.status}
          </span>
          <span style={{ fontSize: 13, color: '#BBB' }}>کد رهگیری: <b dir="ltr" style={{ color: '#fff', unicodeBidi: 'isolate' }}>{data.track}</b></span>
        </div>
      </div>

      <div style={{ padding: '22px 24px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', gap: 14, alignItems: 'center', borderBottom: '1px dashed #EAEAEA' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#FF5B0F', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="building-store" size={15} />مبدا (بارگیری)</div>
          <div style={{ marginTop: 6, fontSize: 16, fontWeight: 800, color: '#141414' }}>{data.fromTitle}</div>
          <div style={{ marginTop: 4, fontSize: 13, color: '#777', lineHeight: 1.8 }}>{data.fromAddr}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#CCC' }}>
          <Icon name="truck" size={24} style={{ color: '#FF5B0F', transform: 'scaleX(-1)' }} />
          <span style={{ fontSize: 12, color: '#999', whiteSpace: 'nowrap' }}>{data.distance}</span>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1F9D55', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="map-pin" size={15} />مقصد (تخلیه)</div>
          <div style={{ marginTop: 6, fontSize: 16, fontWeight: 800, color: '#141414' }}>{data.toTitle}</div>
          <div style={{ marginTop: 4, fontSize: 13, color: '#777', lineHeight: 1.8 }}>{data.toAddr}</div>
        </div>
      </div>

      <div style={{ ...section, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '16px 22px' }}>
        {data.rows.map((r) => (
          <div key={r.k}>
            <div style={{ fontSize: 12, color: '#999', fontWeight: 600 }}>{r.k}</div>
            <div style={{ marginTop: 4, fontSize: 14, fontWeight: 700, color: '#222', lineHeight: 1.8 }}>{r.v}</div>
          </div>
        ))}
      </div>

      <div style={{ ...section, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 46, height: 46, borderRadius: '50%', background: '#F4F4F4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}><Icon name="steering-wheel" size={24} /></span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#141414' }}>{data.driverName}</div>
            <div style={{ fontSize: 13, color: '#777' }}>{data.vehicle}</div>
          </div>
        </div>
        <Plate {...data.plate} />
      </div>

      <div style={{ padding: '20px 24px', background: '#FFF8F4' }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: '#141414', display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="alert-triangle" size={18} style={{ color: '#FF5B0F' }} />نکات برگ حمل</div>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.notes.map((n) => (
            <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, lineHeight: 1.9, color: '#444' }}>
              <Icon name="point-filled" size={14} style={{ color: '#FF5B0F', marginTop: 5 }} /><span>{n}</span>
            </div>
          ))}
        </div>
        {data.adminNote && (
          <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 12, background: '#fff', border: '1px dashed #F1C3AC', fontSize: 13, color: '#555', lineHeight: 1.9 }}>
            <b style={{ color: '#FF5B0F' }}>یادداشت داخلی مدیر:</b> {data.adminNote}
          </div>
        )}
      </div>
    </div>
  );
}

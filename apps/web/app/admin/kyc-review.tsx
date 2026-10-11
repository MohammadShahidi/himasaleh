'use client';

// Expert review of driver registrations (phase 1). The full admin panel (design/project/admin*.dc.html) arrives in phase 3.
import { KYC_KIND_LABEL, type KycKind, REJECT_REASONS, toFaDigits, VEHICLE_BODY_LABEL, VEHICLE_TYPE_LABEL, type VehicleBody, type VehicleType, OWNER_RELATION_LABEL, type OwnerRelation } from '@hm/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Icon } from '@/components/icon';
import { ApiError, api } from '@/lib/api';

interface QueueRow { id: string; firstName: string; lastName: string; nationalId: string; city: string | null; submittedAt: string }
interface Item { id: string; kind: KycKind; label: string; fileId: string; status: 'pending' | 'approved' | 'rejected'; rejectReason: string | null; scriptSnapshot: string | null; shahkarResult: { mode?: string; matched?: boolean; error?: string; by?: string } | null }
interface Detail {
  id: string; status: string; phone: string; firstName: string; lastName: string; nationalId: string; licenseNo: string | null; province: string | null; city: string | null; serviceCities: string[]; address: string | null;
  vehicle: null | { type: VehicleType; body: VehicleBody; capacityTon: number | null; year: number | null; plate: string };
  owner: null | { firstName: string; lastName: string; nationalId: string; phone: string; relation: OwnerRelation; relationOther: string | null; videoLinkIssuedAt: string | null };
  items: Item[];
}

const card = { background: '#fff', border: '1px solid #EFEFEF', borderRadius: 18, padding: 18 } as const;
const chipStyle = (bg: string, c: string) => ({ background: bg, color: c, borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 800 }) as const;
const VIDEO: KycKind[] = ['selfie_video', 'owner_video'];

function FileView({ item }: { item: Item }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const open = async () => {
    try { setUrl((await api<{ url: string }>(`/files/${item.fileId}/url`)).url); } catch (e) { setErr(e instanceof ApiError ? e.message : 'باز نشد'); }
  };
  if (!url) return <button onClick={open} style={{ border: '1.5px solid #141414', background: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>{err || 'نمایش (ثبت می‌شود)'}</button>;
  return VIDEO.includes(item.kind)
    ? <video src={url} controls playsInline style={{ width: '100%', maxHeight: 280, borderRadius: 12, background: '#000' }} />
    : <a href={url} target="_blank" rel="noopener"><img src={url} alt={item.label} style={{ width: '100%', maxHeight: 280, objectFit: 'contain', borderRadius: 12, background: '#F4F4F4' }} /></a>;
}

function ItemRow({ item, driverId }: { item: Item; driverId: string }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState<string>('');
  const [match, setMatch] = useState<'' | 'yes' | 'no'>('');
  const review = useMutation({
    mutationFn: (body: object) => api(`/kyc/items/${item.id}/review`, { method: 'POST', json: body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kyc-detail', driverId] }),
  });
  const isNid = item.kind === 'national_id_front';
  const sk = item.shahkarResult;
  const chip = item.status === 'approved' ? chipStyle('#E6F6EC', '#178A48') : item.status === 'rejected' ? chipStyle('#FDECEA', '#C8341E') : chipStyle('#FFF6E0', '#7A5600');
  return (
    <div style={{ ...card, padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <b style={{ fontSize: 15 }}>{KYC_KIND_LABEL[item.kind]}</b>
        <span style={chip}>{item.status === 'approved' ? 'تایید شد' : item.status === 'rejected' ? `رد: ${item.rejectReason}` : 'در انتظار'}</span>
      </div>
      <div style={{ marginTop: 10 }}><FileView item={item} /></div>
      {item.scriptSnapshot && <div style={{ marginTop: 10, background: '#FFF8F4', border: '1px dashed #F1C3AC', borderRadius: 12, padding: 12, fontSize: 13, lineHeight: 2 }}><b>متنی که باید می‌خواند:</b><br />{item.scriptSnapshot}</div>}
      {isNid && sk && (
        <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: sk.error ? '#7A5600' : sk.matched ? '#178A48' : '#C8341E' }}>
          شاهکار ({sk.mode}): {sk.error ? `خطا — ${sk.error}` : sk.matched ? 'موبایل و کد ملی یکی است' : 'موبایل و کد ملی یکی نیست'}
        </div>
      )}
      {item.status === 'pending' && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isNid && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
              تطابق موبایل و کد ملی (دستی):
              <button onClick={() => setMatch('yes')} style={{ border: `1.5px solid ${match === 'yes' ? '#22A45D' : '#E2E2E2'}`, background: match === 'yes' ? '#F2FBF5' : '#fff', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>یکی است</button>
              <button onClick={() => setMatch('no')} style={{ border: `1.5px solid ${match === 'no' ? '#E0371F' : '#E2E2E2'}`, background: match === 'no' ? '#FDECEA' : '#fff', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>یکی نیست</button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button disabled={review.isPending} onClick={() => review.mutate({ decision: 'approve', ...(isNid && match ? { shahkarMatch: match === 'yes' } : {}) })} style={{ background: '#22A45D', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>تایید</button>
            <select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="علت رد" style={{ border: '1.5px solid #E2E2E2', borderRadius: 10, padding: '0 10px', height: 40, fontFamily: 'inherit', fontSize: 14 }}>
              <option value="">علت رد…</option>
              {REJECT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button disabled={!reason || review.isPending} onClick={() => review.mutate({ decision: 'reject', reason, ...(isNid && match ? { shahkarMatch: match === 'yes' } : {}) })} style={{ background: reason ? '#C8341E' : '#E2E2E2', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 800, cursor: reason ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>رد</button>
          </div>
          {review.error && <div style={{ color: '#C8341E', fontSize: 13 }}>{review.error instanceof ApiError ? review.error.message : 'خطا'}</div>}
        </div>
      )}
    </div>
  );
}

function DriverReview({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['kyc-detail', id], queryFn: () => api<Detail>(`/kyc/drivers/${id}`) });
  const finish = useMutation({
    mutationFn: () => api<{ status: string }>(`/kyc/drivers/${id}/finish`, { method: 'POST' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['kyc-queue'] }); onBack(); },
  });
  if (!data) return <div style={{ padding: 24, color: '#888' }}>در حال بارگذاری…</div>;
  const pending = data.items.filter((i) => i.status === 'pending').length;
  const rows: [string, string][] = [
    ['نام', `${data.firstName} ${data.lastName}`], ['کد ملی', toFaDigits(data.nationalId)], ['موبایل', toFaDigits(data.phone)], ['گواهینامه', data.licenseNo ? toFaDigits(data.licenseNo) : '—'],
    ['خودرو', data.vehicle ? `${VEHICLE_TYPE_LABEL[data.vehicle.type].label} — ${VEHICLE_BODY_LABEL[data.vehicle.body]}` : '—'], ['پلاک', data.vehicle ? toFaDigits(data.vehicle.plate) : '—'],
    ['محل سکونت', `${data.province ?? ''}، ${data.city ?? ''} — ${data.address ?? ''}`], ['شهرهای سرویس', data.serviceCities.join('، ')],
    ...(data.owner ? [['مالک خودرو', `${data.owner.firstName} ${data.owner.lastName} (${data.owner.relation === 'other' ? data.owner.relationOther : OWNER_RELATION_LABEL[data.owner.relation]})`] as [string, string], ['کد ملی و موبایل مالک', `${toFaDigits(data.owner.nationalId)} — ${toFaDigits(data.owner.phone)}`] as [string, string], ['لینک ضبط مالک', data.owner.videoLinkIssuedAt ? 'ساخته شده' : 'ساخته نشده'] as [string, string]] : [['مالک خودرو', 'خود راننده'] as [string, string]]),
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <button onClick={onBack} style={{ alignSelf: 'flex-start', border: 'none', background: 'none', color: '#FF5B0F', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>← بازگشت به صف</button>
      <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
        {rows.map(([k, v]) => <div key={k}><div style={{ fontSize: 12, color: '#999' }}>{k}</div><div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.8 }}>{v}</div></div>)}
      </div>
      {data.items.map((i) => <ItemRow key={i.id} item={i} driverId={id} />)}
      <button disabled={pending > 0 || finish.isPending} onClick={() => finish.mutate()} style={{ height: 54, border: 'none', borderRadius: 14, background: pending ? '#CFCFCF' : '#FF5B0F', color: '#fff', fontSize: 16, fontWeight: 900, cursor: pending ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
        {pending ? `${toFaDigits(pending)} مدرک هنوز بررسی نشده` : 'پایان بررسی و اطلاع به راننده'}
      </button>
      {finish.error && <div style={{ color: '#C8341E', fontSize: 14, fontWeight: 700 }}>{finish.error instanceof ApiError ? finish.error.message : 'خطا'}</div>}
    </div>
  );
}

export function KycReview() {
  const [open, setOpen] = useState<string | null>(null);
  const { data } = useQuery({ queryKey: ['kyc-queue'], queryFn: () => api<{ drivers: QueueRow[] }>('/kyc/queue'), refetchInterval: 20_000 });
  if (open) return <DriverReview id={open} onBack={() => setOpen(null)} />;
  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, fontWeight: 900 }}><Icon name="id" size={22} style={{ color: '#FF5B0F' }} />صف بررسی مدارک رانندگان <span style={chipStyle('#FFF0E8', '#FF5B0F')}>{toFaDigits(data?.drivers.length ?? 0)}</span></div>
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data?.drivers.length === 0 && <div style={{ color: '#888', fontSize: 14 }}>موردی در صف نیست.</div>}
        {data?.drivers.map((d) => (
          <button key={d.id} onClick={() => setOpen(d.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #EEE', borderRadius: 12, background: '#FAFAFA', padding: '12px 14px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right' }}>
            <span style={{ fontWeight: 800 }}>{d.firstName} {d.lastName} <span style={{ color: '#999', fontWeight: 500 }}>— {d.city ?? ''}</span></span>
            <span style={{ fontSize: 12, color: '#999' }}>{new Date(d.submittedAt).toLocaleString('fa-IR')}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Dev/acceptance only: the API answers 404 unless ENABLE_DEV_TOOLS is on. */
export function TestTripTool() {
  const [msg, setMsg] = useState('');
  const make = useMutation({
    mutationFn: () => api<{ offered: number; waybillNo: string }>('/dev/test-trips', { method: 'POST', json: {} }),
    onSuccess: (r) => setMsg(`بار آزمایشی ${toFaDigits(r.waybillNo)} ساخته شد و برای ${toFaDigits(r.offered)} راننده آنلاین فرستاده شد.`),
    onError: (e) => setMsg(e instanceof ApiError && e.status === 404 ? 'ابزار آزمایشی در این سرور غیرفعال است.' : e instanceof ApiError ? e.message : 'خطا'),
  });
  return (
    <div style={card}>
      <div style={{ fontSize: 16, fontWeight: 900 }}>ساخت بار آزمایشی</div>
      <p style={{ margin: '6px 0 12px', fontSize: 13, color: '#777', lineHeight: 1.9 }}>برای آزمایش پنل راننده: یک بار نمونه برای رانندگان تاییدشده‌ای که «سر کارم» هستند می‌فرستد.</p>
      <button onClick={() => make.mutate()} disabled={make.isPending} style={{ border: '1.5px solid #141414', background: '#fff', borderRadius: 12, padding: '10px 18px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>ارسال بار آزمایشی</button>
      {msg && <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700, color: '#444' }}>{msg}</div>}
    </div>
  );
}

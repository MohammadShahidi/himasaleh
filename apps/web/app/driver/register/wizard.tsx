'use client';

// Port of design/project/driver-register.dc.html: the six-step registration, wired to /drivers/me and /files.
import {
  consentScripts, digitsOnly, isNationalId, type KycKind, normalizeMobile, OWNER_RELATION_LABEL, OWNER_RELATIONS, type OwnerRelation,
  needsOwnerAuthorization, ownerProofOk, toFaDigits, VEHICLE_BODIES, VEHICLE_BODY_LABEL, VEHICLE_TYPE_LABEL, VEHICLE_TYPES, type VehicleBody, type VehicleType,
} from '@hm/shared';
import { useRouter } from 'next/navigation';
import { type ChangeEvent, type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/icon';
import { MapPicker } from '@/components/map-picker';
import { ApiError, api } from '@/lib/api';
import { PROVINCES } from '@/lib/provinces';
import { useSession } from '@/lib/session';
import { uploadFile } from '@/lib/upload';

const STEPS: [IconName, string][] = [['user', 'اطلاعات فردی'], ['truck', 'اطلاعات خودرو'], ['id', 'مدارک'], ['video', 'ویدیو احراز هویت'], ['map-pin', 'محل سکونت'], ['checklist', 'بازبینی و ارسال']];
const LETTERS = ['الف', 'ب', 'پ', 'ت', 'ج', 'د', 'س', 'ص', 'ط', 'ع', 'ق', 'ل', 'م', 'ن', 'و', 'ه', 'ی'];
const VT_ICON: Record<VehicleType, IconName> = { pickup: 'truck', khavar: 'truck', kamyonet: 'truck', single_truck: 'truck-delivery', ten_wheeler: 'truck-delivery', trailer: 'truck-delivery' };

type DocSlot = { kind: KycKind; label: string; icon: IconName; required: boolean };
const DOCS: DocSlot[] = [
  { kind: 'national_id_front', label: 'کارت ملی (رو)', icon: 'id', required: true },
  { kind: 'national_id_back', label: 'کارت ملی (پشت)', icon: 'id', required: true },
  { kind: 'vehicle_card_front', label: 'کارت ماشین (رو)', icon: 'car', required: true },
  { kind: 'vehicle_card_back', label: 'کارت ماشین (پشت)', icon: 'car', required: true },
  { kind: 'green_sheet', label: 'برگ سبز خودرو', icon: 'file-certificate', required: true },
  { kind: 'license', label: 'گواهینامه', icon: 'license', required: false },
];

interface MeResponse {
  profile: null | {
    status: 'draft' | 'submitted' | 'needs_fix' | 'approved' | 'blocked';
    firstName: string; lastName: string; nationalId: string; licenseNo: string | null; refCode: string | null;
    province: string | null; city: string | null; serviceCities: string[]; address: string | null; postalCode: string | null; lat: number | null; lng: number | null;
    vehicle: null | { type: VehicleType; body: VehicleBody; capacityTon: number | null; year: number | null; plate1: string; plateLetter: string; plate2: string; plate3: string };
    owner: null | { firstName: string; lastName: string; nationalId: string; phone: string; relation: OwnerRelation; relationOther: string | null; videoLinkSentAt: string | null };
  };
  items?: { kind: KycKind; status: 'pending' | 'approved' | 'rejected'; rejectReason: string | null; fileId: string }[];
  rejected?: { kind: KycKind; reason: string | null }[];
}

interface Doc { name: string; url?: string; image?: boolean; fileId?: string; busy?: boolean; status?: 'pending' | 'approved' | 'rejected'; reason?: string | null }

const inputBase: CSSProperties = { marginTop: 8, width: '100%', height: 54, background: '#FAFAFA', borderRadius: 14, padding: '0 16px', fontSize: 15, color: '#141414' };
const lab: CSSProperties = { display: 'block', fontSize: 14, fontWeight: 700, color: '#222' };
const h2: CSSProperties = { margin: 0, fontSize: 24, fontWeight: 900, color: '#141414' };
const sub: CSSProperties = { margin: '6px 0 0', fontSize: 14, color: '#888' };
const star = <span style={{ color: '#FF5B0F' }}>*</span>;
const grid2: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 16 };

function Field({ label, req, value, onChange, ph, num, bad, msg, height = 54, dir }: { label: string; req?: boolean; value: string; onChange: (v: string) => void; ph?: string; num?: number; bad?: boolean; msg?: string; height?: number; dir?: 'ltr' }) {
  return (
    <div>
      <label style={lab}>{label} {req && star}</label>
      <input data-field="" type={num ? 'tel' : 'text'} inputMode={num ? 'numeric' : 'text'} dir={num ? 'ltr' : dir} value={num ? toFaDigits(value) : value}
        onChange={(e) => onChange(num ? digitsOnly(e.target.value, num) : e.target.value)} placeholder={ph}
        style={{ ...inputBase, height, border: `1.5px solid ${bad ? '#E0371F' : '#ECECEC'}`, textAlign: num ? 'left' : 'right' }} />
      {bad && msg && <div style={{ marginTop: 6, fontSize: 12, color: '#E0371F' }}>{msg}</div>}
    </div>
  );
}

function UploadBox({ slot, doc, locked, bad, onPick, onRemove }: { slot: DocSlot; doc?: Doc; locked?: boolean; bad?: boolean; onPick: (f: File) => void; onRemove: () => void }) {
  const rejected = doc?.status === 'rejected';
  const border = rejected ? '#E0371F' : bad ? '#E0371F' : doc ? '#FF5B0F' : '#D8D8D8';
  return (
    <div>
      <label data-up="" style={{ position: 'relative', display: 'block', aspectRatio: 1.55, border: `1.5px dashed ${border}`, borderRadius: 16, background: '#FAFAFA', cursor: locked ? 'not-allowed' : 'pointer', overflow: 'hidden', opacity: locked ? 0.7 : 1 }}>
        <input type="file" accept="image/*,application/pdf" disabled={locked} onChange={(e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; }} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
        {!doc ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center', padding: 10 }}>
            <span style={{ width: 46, height: 46, borderRadius: 14, background: '#FFF0E8', color: '#FF5B0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={slot.icon} size={24} /></span>
            <span style={{ fontSize: 12, color: '#888' }}>انتخاب فایل یا عکس گرفتن</span>
          </div>
        ) : (
          <>
            {doc.url && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url('${doc.url}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />}
            <div style={{ position: 'absolute', inset: 'auto 0 0 0', padding: 10, background: 'linear-gradient(to top,rgba(0,0,0,.75),transparent)', color: '#fff', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name={doc.busy ? 'loader-2' : 'circle-check-filled'} size={16} className={doc.busy ? 'hm-spin' : undefined} style={{ color: '#3DDC84' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.busy ? 'در حال ارسال…' : doc.status === 'approved' ? 'تایید شد' : doc.status === 'rejected' ? `رد شد: ${doc.reason ?? ''}` : doc.name}</span>
            </div>
            {!locked && !doc.busy && (
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }} type="button" aria-label="حذف" style={{ position: 'absolute', top: 8, left: 8, width: 32, height: 32, borderRadius: 10, border: 'none', background: 'rgba(0,0,0,.6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="trash" size={16} /></button>
            )}
          </>
        )}
      </label>
      <div style={{ marginTop: 8, fontSize: 14, fontWeight: 700, color: '#222' }}>{slot.label} <span style={{ color: '#FF5B0F' }}>{slot.required ? '*' : '(اختیاری)'}</span></div>
    </div>
  );
}

const errBox = (text: string) => <div style={{ marginTop: 12, fontSize: 13, color: '#E0371F', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="alert-circle" size={16} />{text}</div>;

export function DriverWizard() {
  const router = useRouter();
  const { user, forbidden } = useSession(['driver']);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<'draft' | 'submitted' | 'needs_fix' | 'approved' | 'blocked'>('draft');
  const [step, setStep] = useState(1);
  const [max, setMax] = useState(1);
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverErr, setServerErr] = useState('');

  const [fn, setFn] = useState(''); const [ln, setLn] = useState(''); const [nid, setNid] = useState(''); const [lic, setLic] = useState(''); const [ref, setRef] = useState('');
  const [vt, setVt] = useState<VehicleType | null>(null); const [bt, setBt] = useState<VehicleBody | null>(null);
  const [p1, setP1] = useState(''); const [pL, setPL] = useState('ع'); const [p2, setP2] = useState(''); const [p3, setP3] = useState('');
  const [capacity, setCapacity] = useState(''); const [year, setYear] = useState('');
  const [ownerKind, setOwnerKind] = useState<'self' | 'other'>('self');
  const [ofn, setOfn] = useState(''); const [oln, setOln] = useState(''); const [onid, setOnid] = useState(''); const [ophone, setOphone] = useState('');
  const [rel, setRel] = useState<OwnerRelation | null>(null); const [relOther, setRelOther] = useState('');
  const [docs, setDocs] = useState<Partial<Record<KycKind, Doc>>>({});
  const [prov, setProv] = useState('تهران'); const [city, setCity] = useState('تهران'); const [serve, setServe] = useState<string[]>(['تهران']);
  const [addr, setAddr] = useState(''); const [postal, setPostal] = useState(''); const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [agree, setAgree] = useState(false);
  const [ownerLink, setOwnerLink] = useState<{ url: string } | null>(null);
  const [linkIssued, setLinkIssued] = useState(false);
  const [copied, setCopied] = useState(false);
  const lockedKinds = useRef<Set<KycKind>>(new Set());

  const phone = user?.phone ?? '';

  // Load an existing registration (resume, or fix rejected documents).
  useEffect(() => {
    if (!user || forbidden) return;
    api<MeResponse>('/drivers/me').then((r) => {
      const p = r.profile;
      if (p) {
        setStatus(p.status);
        if (p.status === 'approved') { router.replace('/driver'); return; }
        setFn(p.firstName); setLn(p.lastName); setNid(p.nationalId); setLic(p.licenseNo ?? ''); setRef(p.refCode ?? '');
        if (p.vehicle) { setVt(p.vehicle.type); setBt(p.vehicle.body); setP1(p.vehicle.plate1); setPL(p.vehicle.plateLetter); setP2(p.vehicle.plate2); setP3(p.vehicle.plate3); setCapacity(p.vehicle.capacityTon?.toString() ?? ''); setYear(p.vehicle.year?.toString() ?? ''); }
        if (p.owner) { setOwnerKind('other'); setOfn(p.owner.firstName); setOln(p.owner.lastName); setOnid(p.owner.nationalId); setOphone(p.owner.phone); setRel(p.owner.relation); setRelOther(p.owner.relationOther ?? ''); setLinkIssued(!!p.owner.videoLinkSentAt); }
        if (p.province) setProv(p.province);
        if (p.city) setCity(p.city);
        if (p.serviceCities.length) setServe(p.serviceCities);
        setAddr(p.address ?? ''); setPostal(p.postalCode ?? '');
        if (p.lat != null && p.lng != null) setGeo({ lat: p.lat, lng: p.lng });
        const d: Partial<Record<KycKind, Doc>> = {};
        for (const it of r.items ?? []) d[it.kind] = { name: 'ارسال شده', fileId: it.fileId, status: it.status, reason: it.rejectReason };
        setDocs(d);
        if (p.status === 'submitted') setStep(7);
        else if (p.status === 'needs_fix') {
          lockedKinds.current = new Set((r.items ?? []).filter((i) => i.status !== 'rejected').map((i) => i.kind));
          setStep(3); setMax(6);
        } else setMax(6);
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [user, forbidden, router]);

  const owner = ownerKind === 'other';
  const authReq = rel != null && needsOwnerAuthorization(rel);
  const relName = rel == null ? '' : rel === 'other' ? relOther.trim() || 'سایر' : OWNER_RELATION_LABEL[rel];
  const nidOk = isNationalId(nid);
  const plateOk = p1.length === 2 && p2.length === 3 && p3.length === 2;
  const ownerOk = !owner || (ofn.trim() && oln.trim() && isNationalId(onid) && normalizeMobile(ophone) && rel != null && (rel !== 'other' || relOther.trim()));
  const have = (k: KycKind) => !!docs[k] && docs[k]!.status !== 'rejected';
  const haveSet = new Set((Object.keys(docs) as KycKind[]).filter(have));
  const plateText = p1 ? `${toFaDigits(p1)} ${pL} ${toFaDigits(p2)} - ایران ${toFaDigits(p3)}` : '[پلاک]';
  const scripts = useMemo(() => consentScripts({
    driverName: `${fn} ${ln}`.trim() || '[نام و نام خانوادگی]', driverNationalId: nid ? toFaDigits(nid) : '[کد ملی]', plate: plateText,
    owner: owner ? { name: `${ofn} ${oln}`.trim() || '[نام مالک]', nationalId: onid ? toFaDigits(onid) : '[کد ملی مالک]', relation: relName || 'نسبت' } : null,
  }), [fn, ln, nid, plateText, owner, ofn, oln, onid, relName]);

  const valid = (s: number): boolean => {
    if (s === 1) return !!(fn.trim() && ln.trim() && nidOk && normalizeMobile(phone));
    if (s === 2) return !!(vt && bt && plateOk && ownerOk);
    // The owner's proof (authorization document or consent video) is judged in step 4, where the video can be recorded.
    if (s === 3) return DOCS.every((d) => !d.required || have(d.kind)) && (!owner || (have('owner_national_id_front') && have('owner_national_id_back')));
    if (s === 4) return have('selfie_video') && (!owner || (rel != null && ownerProofOk(rel, haveSet, linkIssued)));
    if (s === 5) return !!(city && addr.trim().length > 5);
    if (s === 6) return agree;
    return true;
  };

  const profilePayload = useCallback(() => ({
    firstName: fn.trim(), lastName: ln.trim(), nationalId: nid, ...(lic ? { licenseNo: lic } : {}), ...(ref.trim() ? { refCode: ref.trim() } : {}),
    vehicle: { type: vt, body: bt, plate1: p1, plateLetter: pL, plate2: p2, plate3: p3, ...(capacity ? { capacityTon: Number(capacity) } : {}), ...(year ? { year: Number(year) } : {}) },
    owner: owner ? { firstName: ofn.trim(), lastName: oln.trim(), nationalId: onid, phone: normalizeMobile(ophone), relation: rel, ...(rel === 'other' ? { relationOther: relOther.trim() } : {}) } : null,
    province: prov, city, serviceCities: serve, ...(addr.trim() ? { address: addr.trim() } : {}), ...(postal ? { postalCode: postal } : {}), ...(geo ? { lat: geo.lat, lng: geo.lng } : {}),
  }), [fn, ln, nid, lic, ref, vt, bt, p1, pL, p2, p3, capacity, year, owner, ofn, oln, onid, ophone, rel, relOther, prov, city, serve, addr, postal, geo]);

  const save = async () => { await api('/drivers/me', { method: 'PUT', json: profilePayload() }); };

  const pickDoc = async (kind: KycKind, file: File) => {
    setServerErr('');
    const url = file.type.startsWith('image/') || file.type.startsWith('video/') ? URL.createObjectURL(file) : undefined;
    const image = file.type.startsWith('image/');
    setDocs((d) => ({ ...d, [kind]: { name: file.name, image, ...(url ? { url } : {}), busy: true } }));
    try {
      const up = await uploadFile(file);
      const script = kind === 'selfie_video' ? scripts.driver : kind === 'owner_video' ? scripts.owner ?? undefined : undefined;
      await api('/drivers/me/kyc', { method: 'POST', json: { kind, fileId: up.id, ...(script ? { scriptSnapshot: script } : {}) } });
      setDocs((d) => ({ ...d, [kind]: { name: file.name, image, ...(url ? { url } : {}), fileId: up.id, status: 'pending' } }));
    } catch (e) {
      setDocs((d) => { const n = { ...d }; delete n[kind]; return n; });
      setServerErr(e instanceof ApiError ? e.message : 'ارسال فایل ممکن نشد. اینترنت را بررسی کنید.');
    }
  };
  const removeDoc = (kind: KycKind) => setDocs((d) => { const n = { ...d }; delete n[kind]; return n; });

  const next = async () => {
    if (busy) return;
    if (!valid(step)) { setErr(true); return; }
    setBusy(true); setServerErr('');
    try {
      if (step === 2 || step === 5) await save();
      if (step === 6) { await save(); await api('/drivers/me/submit', { method: 'POST' }); setStatus('submitted'); setStep(7); }
      else { setStep(step + 1); setMax(Math.max(max, step + 1)); }
      setErr(false);
      window.scrollTo({ top: 260, behavior: 'smooth' });
    } catch (e) {
      setServerErr(e instanceof ApiError ? e.message : 'ارتباط برقرار نشد. اینترنت را بررسی کنید.');
    } finally { setBusy(false); }
  };

  const issueLink = async () => {
    setServerErr('');
    try {
      const r = await api<{ url: string }>('/drivers/me/owner/video-link', { method: 'POST' });
      setOwnerLink(r); setLinkIssued(true); setCopied(false);
    } catch (e) { setServerErr(e instanceof ApiError ? e.message : 'ساخت لینک ممکن نشد.'); }
  };
  const copyLink = async () => {
    if (!ownerLink) return;
    try { await navigator.clipboard.writeText(ownerLink.url); setCopied(true); } catch { setServerErr('کپی نشد؛ لینک را نگه دارید و دستی کپی کنید.'); }
  };

  if (!user || !loaded) return <main style={{ padding: 24, textAlign: 'center', color: '#888' }}>در حال بارگذاری…</main>;
  if (forbidden) { router.replace('/account'); return null; }

  const bad = (c: boolean) => err && c;
  const cities = PROVINCES[prov] ?? [];
  const rejectedList = (Object.entries(docs) as [KycKind, Doc][]).filter(([, d]) => d.status === 'rejected');
  const stepState = (i: number) => (i === step ? 'cur' : i < max || i < step ? 'done' : 'todo');
  const progress = step > 6 ? '100%' : `${((step - 1) / 6) * 100 + 4}%`;
  const locked = (k: KycKind) => status === 'needs_fix' && lockedKinds.current.has(k);

  const summary: { k: string; v: string }[] = [
    ...(owner ? [{ k: 'مالک خودرو', v: `${ofn} ${oln} — ${relName}` }, { k: 'ویدیو مالک', v: have('owner_video') ? 'بارگذاری شده' : linkIssued ? 'لینک ساخته شد — در انتظار' : '—' }] : [{ k: 'مالک خودرو', v: 'خود راننده' }]),
    { k: 'نام و نام خانوادگی', v: `${fn} ${ln}` }, { k: 'کد ملی', v: toFaDigits(nid) }, { k: 'موبایل', v: toFaDigits(phone) },
    { k: 'خودرو', v: vt && bt ? `${VEHICLE_TYPE_LABEL[vt].label} — ${VEHICLE_BODY_LABEL[bt]}` : '—' }, { k: 'پلاک', v: p1 ? plateText : '—' },
    { k: 'ظرفیت', v: capacity ? `${toFaDigits(capacity)} تن` : '—' }, { k: 'محل سکونت', v: `${prov}، ${city}` }, { k: 'شهرهای سرویس', v: serve.join('، ') },
    { k: 'موقعیت روی نقشه', v: geo ? 'ثبت شد' : 'ثبت نشده' }, { k: 'مدارک', v: `${toFaDigits(Object.keys(docs).length)} فایل بارگذاری شده` },
  ];

  return (
    <div dir="rtl" style={{ background: '#F6F6F6', minHeight: '100vh', minWidth: 0, overflowX: 'clip' }}>
      <section style={{ position: 'relative', background: '#121212', color: '#fff', overflow: 'hidden', padding: '150px 0 120px', borderBottomLeftRadius: '62% 110px' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '50%', background: "url('/c2.jpg') center/cover", opacity: 0.35, WebkitMaskImage: 'linear-gradient(to left,transparent,#000 60%)', maskImage: 'linear-gradient(to left,transparent,#000 60%)' }} />
        <div data-wrap="" style={{ position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '0 40px' }}>
          <h1 data-reveal="" style={{ margin: '18px 0 0', fontSize: 'clamp(30px,3.6vw,48px)', fontWeight: 900 }}>ثبت‌نام رانندگان و صاحبان خودرو</h1>
          <p data-reveal="" data-delay="1" style={{ margin: '14px 0 0', fontSize: 'clamp(15px,1.4vw,18px)', color: '#D0D0D0', lineHeight: 2, maxWidth: 620 }}>مدارک خود را یک‌بار بارگذاری کنید؛ هر وقت در شهر شما بار ثبت شود، بار برای شما ارسال می‌شود.</p>
        </div>
      </section>

      <section data-wrap="" data-wiz="" style={{ position: 'relative', zIndex: 2, maxWidth: 1200, margin: '-70px auto 0', padding: '0 40px 80px', display: 'grid', gridTemplateColumns: '270px minmax(0,1fr)', gap: 24, alignItems: 'start' }}>
        <div data-wsteps="" style={{ position: 'sticky', top: 96, display: 'flex', flexDirection: 'column', gap: 6, background: '#EFEFEF', borderRadius: 20, padding: 10 }}>
          {STEPS.map(([icon, label], i) => (
            <div key={label} data-wstep="" data-state={stepState(i + 1)} onClick={() => { if (step <= 6 && (i + 1 < step || i + 1 <= max)) { setStep(i + 1); setErr(false); } }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14 }}>
              <span data-wstep-n="" style={{ width: 38, height: 38, flex: 'none', borderRadius: 12, border: '1.5px solid #DADADA', background: '#fff', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .4s' }}><Icon name={icon} size={19} /></span>
              <span data-wstep-txt="" style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 12, color: '#999', fontWeight: 600 }}>مرحله {toFaDigits(i + 1)}</span><span style={{ fontSize: 14, fontWeight: 800, color: '#222' }}>{label}</span></span>
            </div>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: 24, boxShadow: '0 20px 60px rgba(0,0,0,.08)', overflow: 'hidden' }}>
          <div style={{ height: 5, background: '#F1F1F1' }}><div style={{ height: '100%', width: progress, background: 'linear-gradient(to left,#FF5B0F,#FF9A3D)', transition: 'width .6s cubic-bezier(.2,.8,.2,1)' }} /></div>
          <div style={{ padding: 'clamp(22px,3.5vw,40px)' }}>
            {status === 'needs_fix' && step <= 6 && (
              <div style={{ marginBottom: 22, background: '#FDECEA', border: '1px solid #F5C6C0', borderRadius: 16, padding: '14px 16px', fontSize: 14, lineHeight: 1.9, color: '#8A2A1E' }}>
                <b>کارشناس چند مورد را تایید نکرد.</b> فقط همین‌ها را دوباره بفرستید:
                <ul style={{ margin: '6px 0 0', paddingInlineStart: 20 }}>
                  {rejectedList.map(([k, d]) => <li key={k}>{DOCS.find((x) => x.kind === k)?.label ?? (k === 'selfie_video' ? 'ویدیو احراز هویت' : k === 'owner_video' ? 'ویدیو رضایت مالک' : k)} — {d.reason}</li>)}
                </ul>
              </div>
            )}
            {serverErr && <div style={{ marginBottom: 16, background: '#FDECEA', borderRadius: 12, padding: '10px 14px', fontSize: 14, color: '#C8341E', fontWeight: 700 }}>{serverErr}</div>}

            {step === 1 && (
              <div data-pane="">
                <h2 style={h2}>اطلاعات فردی</h2>
                <p style={sub}>اطلاعات باید با کارت ملی شما یکسان باشد.</p>
                <div data-g2="" style={{ ...grid2, marginTop: 24 }}>
                  <Field label="نام" req value={fn} onChange={setFn} ph="مثلاً حسن" bad={bad(!fn.trim())} msg="نام را وارد کنید" />
                  <Field label="نام خانوادگی" req value={ln} onChange={setLn} ph="مثلاً کریمی" bad={bad(!ln.trim())} msg="نام خانوادگی را وارد کنید" />
                  <Field label="کد ملی" req value={nid} onChange={setNid} ph="۱۰ رقم" num={10} bad={bad(!nidOk)} msg="کد ملی معتبر نیست" />
                  <div>
                    <label style={lab}>شماره موبایل {star}</label>
                    <input data-field="" dir="ltr" readOnly value={toFaDigits(phone)} style={{ ...inputBase, border: '1.5px solid #ECECEC', textAlign: 'left', color: '#666' }} />
                    <div style={{ marginTop: 6, fontSize: 12, color: '#999' }}>همان شماره‌ای که با آن وارد شده‌اید.</div>
                  </div>
                  <Field label="شماره گواهینامه" value={lic} onChange={setLic} ph="اختیاری" num={10} />
                  <Field label="کد معرف" value={ref} onChange={setRef} ph="اگر کسی شما را معرفی کرده (اختیاری)" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div data-pane="">
                <h2 style={h2}>اطلاعات خودرو</h2>
                <p style={sub}>نوع خودرو و بارگیر مشخص می‌کند چه بارهایی برای شما ارسال شود.</p>
                <label style={{ ...lab, marginTop: 24 }}>نوع خودرو {star}</label>
                <div data-g3="" style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 10 }}>
                  {VEHICLE_TYPES.map((t) => (
                    <button key={t} data-chip2="" data-active={vt === t ? '1' : '0'} onClick={() => setVt(t)} type="button" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, border: '1.5px solid #ECECEC', background: '#fff', borderRadius: 14, cursor: 'pointer', textAlign: 'right', color: '#222', fontFamily: 'inherit' }}>
                      <Icon name={VT_ICON[t]} size={24} /><span style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 14, fontWeight: 800 }}>{VEHICLE_TYPE_LABEL[t].label}</span><span style={{ fontSize: 12, color: '#999' }}>{VEHICLE_TYPE_LABEL[t].capacity}</span></span>
                    </button>
                  ))}
                </div>
                <label style={{ ...lab, marginTop: 20 }}>نوع بارگیر {star}</label>
                <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {VEHICLE_BODIES.map((b) => (
                    <button key={b} data-chip2="" data-active={bt === b ? '1' : '0'} onClick={() => setBt(b)} type="button" style={{ border: '1.5px solid #ECECEC', background: '#fff', borderRadius: 999, padding: '10px 18px', fontSize: 14, fontWeight: 700, color: '#333', cursor: 'pointer', fontFamily: 'inherit' }}>{VEHICLE_BODY_LABEL[b]}</button>
                  ))}
                </div>
                <div data-g2="" style={{ ...grid2, marginTop: 20, alignItems: 'end' }}>
                  <div>
                    <label style={lab}>پلاک خودرو {star}</label>
                    <div dir="ltr" style={{ marginTop: 8, display: 'flex', alignItems: 'stretch', height: 58, border: `2.5px solid ${bad(!plateOk) ? '#E0371F' : '#141414'}`, borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                      <div style={{ width: 30, background: '#1E4FD8', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 8, lineHeight: 1.3, fontFamily: 'Arial,sans-serif', fontWeight: 700 }}><span>I.R.</span><span>IRAN</span></div>
                      <input value={toFaDigits(p1)} onChange={(e) => setP1(digitsOnly(e.target.value, 2))} inputMode="numeric" placeholder="۱۲" aria-label="دو رقم اول پلاک" style={{ width: '22%', border: 'none', textAlign: 'center', fontSize: 22, fontWeight: 900, color: '#141414', outline: 'none' }} />
                      <select value={pL} onChange={(e) => setPL(e.target.value)} aria-label="حرف پلاک" style={{ width: '20%', border: 'none', textAlign: 'center', fontSize: 20, fontWeight: 900, color: '#141414', background: '#fff', outline: 'none', appearance: 'none', WebkitAppearance: 'none', textAlignLast: 'center', cursor: 'pointer' }}>
                        {LETTERS.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <input value={toFaDigits(p2)} onChange={(e) => setP2(digitsOnly(e.target.value, 3))} inputMode="numeric" placeholder="۳۴۵" aria-label="سه رقم پلاک" style={{ width: '28%', border: 'none', textAlign: 'center', fontSize: 22, fontWeight: 900, color: '#141414', outline: 'none' }} />
                      <div style={{ flex: 1, borderLeft: '2.5px solid #141414', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#141414' }}>ایران</span>
                        <input value={toFaDigits(p3)} onChange={(e) => setP3(digitsOnly(e.target.value, 2))} inputMode="numeric" placeholder="۶۷" aria-label="کد شهر پلاک" style={{ width: '100%', border: 'none', textAlign: 'center', fontSize: 18, fontWeight: 900, color: '#141414', outline: 'none', padding: 0 }} />
                      </div>
                    </div>
                  </div>
                  <div data-g2="" style={{ ...grid2, gap: 12 }}>
                    <Field label="ظرفیت (تن)" value={capacity} onChange={setCapacity} ph="مثلاً ۱۰" num={2} height={58} />
                    <Field label="سال ساخت" value={year} onChange={setYear} ph="مثلاً ۱۳۹۸" num={4} height={58} />
                  </div>
                </div>

                <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px dashed #E6E6E6' }}>
                  <label style={{ display: 'block', fontSize: 15, fontWeight: 900, color: '#141414' }}>مالک خودرو کیست؟ {star}</label>
                  <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {([['self', 'user-check', 'خودم مالک هستم', 'سند و برگ سبز به نام من است'], ['other', 'users', 'مالک شخص دیگری است', 'مدارک و رضایت مالک لازم است']] as const).map(([k, icon, t1, t2]) => (
                      <button key={k} data-chip2="" data-active={ownerKind === k ? '1' : '0'} onClick={() => setOwnerKind(k)} type="button" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 16, border: '1.5px solid #ECECEC', background: '#fff', borderRadius: 14, cursor: 'pointer', textAlign: 'right', color: '#222', fontFamily: 'inherit' }}>
                        <Icon name={icon} size={26} /><span style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 15, fontWeight: 800 }}>{t1}</span><span style={{ fontSize: 12, color: '#999' }}>{t2}</span></span>
                      </button>
                    ))}
                  </div>
                  {owner && (
                    <div data-pane="" style={{ marginTop: 16, background: '#FAFAFA', border: '1px solid #F0F0F0', borderRadius: 18, padding: 18 }}>
                      <div style={{ fontSize: 15, fontWeight: 900, color: '#141414', display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="id-badge-2" size={20} style={{ color: '#FF5B0F' }} />مشخصات مالک خودرو</div>
                      <div data-g2="" style={{ ...grid2, marginTop: 14, gap: 14 }}>
                        <Field label="نام مالک" req value={ofn} onChange={setOfn} ph="مثلاً حمید" bad={bad(!ofn.trim())} msg="نام مالک را وارد کنید" height={52} />
                        <Field label="نام خانوادگی مالک" req value={oln} onChange={setOln} ph="مثلاً کریمی" bad={bad(!oln.trim())} msg="نام خانوادگی را وارد کنید" height={52} />
                        <Field label="کد ملی مالک" req value={onid} onChange={setOnid} ph="۱۰ رقم" num={10} bad={bad(!isNationalId(onid))} msg="کد ملی مالک معتبر نیست" height={52} />
                        <Field label="موبایل مالک" req value={ophone} onChange={setOphone} ph="۰۹۱۲ ۳۴۵ ۶۷۸۹" num={11} bad={bad(!normalizeMobile(ophone))} msg="موبایل مالک معتبر نیست" height={52} />
                      </div>
                      <label style={{ ...lab, marginTop: 16 }}>نسبت شما با مالک {star}</label>
                      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {OWNER_RELATIONS.map((r) => (
                          <button key={r} data-chip2="" data-active={rel === r ? '1' : '0'} onClick={() => setRel(r)} type="button" style={{ border: `1.5px solid ${bad(rel == null) ? '#E0371F' : '#ECECEC'}`, background: '#fff', borderRadius: 999, padding: '9px 16px', fontSize: 14, fontWeight: 700, color: '#333', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>{OWNER_RELATION_LABEL[r]}</button>
                        ))}
                      </div>
                      {rel === 'other' && <input data-field="" value={relOther} onChange={(e) => setRelOther(e.target.value)} placeholder="نسبت را بنویسید" style={{ marginTop: 10, width: '100%', height: 50, border: '1.5px solid #ECECEC', background: '#fff', borderRadius: 14, padding: '0 16px', fontSize: 15 }} />}
                      <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'flex-start', background: '#FFF6F1', border: '1px dashed #F1C3AC', borderRadius: 14, padding: '12px 14px', fontSize: 13, lineHeight: 1.9, color: '#5A3A2A' }}>
                        <Icon name="shield-check" size={18} style={{ color: '#FF5B0F', marginTop: 2 }} /><span>برای حفظ حقوق مالک و راننده، مدارک هویتی و ویدیو رضایت مالک هم گرفته می‌شود. لینک ضبط ویدیو را در مرحلهٔ ویدیو می‌گیرید و خودتان برای مالک می‌فرستید.</span>
                      </div>
                    </div>
                  )}
                </div>
                {err && !valid(2) && errBox(owner && !ownerOk ? 'مشخصات مالک و نسبت خود با مالک را کامل کنید.' : 'نوع خودرو، بارگیر و پلاک کامل را وارد کنید.')}
              </div>
            )}

            {step === 3 && (
              <div data-pane="">
                <h2 style={h2}>بارگذاری مدارک</h2>
                <p style={sub}>از مدارک اصل، در نور کافی و بدون برش عکس بگیرید. مدارک فقط برای احراز هویت استفاده می‌شود.</p>
                <div data-ups="" style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 16 }}>
                  {DOCS.map((s) => <UploadBox key={s.kind} slot={s} doc={docs[s.kind]} locked={locked(s.kind)} bad={bad(s.required && !have(s.kind))} onPick={(f) => pickDoc(s.kind, f)} onRemove={() => removeDoc(s.kind)} />)}
                </div>
                {owner && (
                  <div data-pane="" style={{ marginTop: 26, paddingTop: 20, borderTop: '1px dashed #E6E6E6' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#141414', display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="users" size={22} style={{ color: '#FF5B0F' }} />مدارک مالک خودرو — {`${ofn} ${oln}`.trim()}</div>
                    <div style={{ marginTop: 4, fontSize: 13, color: '#888', lineHeight: 1.9 }}>{authReq ? 'چون مالک از بستگان درجه یک نیست، یکی از این‌ها لازم است: وکالت‌نامه، رضایت‌نامه محضری، اجاره‌نامه، یا ویدیو رضایت مالک (مرحله بعد).' : 'برای بستگان درجه یک، کارت ملی مالک کافی است؛ مدرک اجازه اختیاری است.'}</div>
                    <div data-ups="" style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 16 }}>
                      {([
                        { kind: 'owner_national_id_front', label: 'کارت ملی مالک (رو)', icon: 'id', required: true },
                        { kind: 'owner_national_id_back', label: 'کارت ملی مالک (پشت)', icon: 'id', required: true },
                        { kind: 'owner_authorization', label: 'وکالت‌نامه، رضایت‌نامه محضری یا اجاره‌نامه', icon: 'file-certificate', required: false },
                      ] as DocSlot[]).map((s) => <UploadBox key={s.kind} slot={s} doc={docs[s.kind]} locked={locked(s.kind)} bad={bad(s.required && !have(s.kind))} onPick={(f) => pickDoc(s.kind, f)} onRemove={() => removeDoc(s.kind)} />)}
                    </div>
                  </div>
                )}
                {err && !valid(3) && errBox('مدارک ستاره‌دار را بارگذاری کنید.')}
              </div>
            )}

            {step === 4 && (
              <div data-pane="">
                <h2 style={h2}>ویدیو احراز هویت</h2>
                <p style={sub}>یک ویدیو کوتاه (۱۰ تا ۳۰ ثانیه) از چهره خود ضبط کنید و کارت ملی را کنار صورت نگه دارید.</p>
                <VideoBlock script={scripts.driver} scriptTitle="این متن را در ویدیو بخوانید" kind="selfie_video" doc={docs['selfie_video']} locked={locked('selfie_video')} onPick={(f) => pickDoc('selfie_video', f)} bad={bad(!have('selfie_video'))} badText="ویدیو احراز هویت الزامی است." />
                {owner && (
                  <div data-pane="" style={{ marginTop: 26, paddingTop: 20, borderTop: '1px dashed #E6E6E6' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#141414', display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="video" size={22} style={{ color: '#FF5B0F' }} />ویدیو رضایت مالک خودرو</div>
                    <div style={{ marginTop: 4, fontSize: 13, color: '#888', lineHeight: 1.9 }}>مالک باید چهره و کارت ملی خود را نشان دهد و متن زیر را بخواند. اگر مالک کنار شما نیست، لینک ضبط را بگیرید و خودتان برایش بفرستید.</div>
                    <div style={{ marginTop: 12, background: '#FFF8F4', border: '1px dashed #F1C3AC', borderRadius: 16, padding: 18 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#141414', display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="quote" size={18} style={{ color: '#FF5B0F' }} />متنی که مالک می‌خواند</div>
                      <div style={{ marginTop: 10, fontSize: 15, lineHeight: 2.1, color: '#333' }}>{scripts.owner}</div>
                    </div>
                    {docs['owner_video']?.url && <video src={docs['owner_video'].url} controls playsInline style={{ marginTop: 12, width: '100%', maxHeight: 320, borderRadius: 16, background: '#000' }} />}
                    <div data-g2="" style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label data-btn="" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#FF5B0F', color: '#fff', fontSize: 15, fontWeight: 800, height: 54, borderRadius: 14, cursor: 'pointer' }}>
                        <input type="file" accept="video/*" capture="user" onChange={(e) => { const f = e.target.files?.[0]; if (f) void pickDoc('owner_video', f); e.target.value = ''; }} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
                        <Icon name="video" size={20} />{docs['owner_video'] ? 'ضبط دوباره' : 'ضبط ویدیو مالک'}
                      </label>
                      <button data-btn="" onClick={issueLink} type="button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: `1.5px solid ${linkIssued ? '#22A45D' : '#141414'}`, background: linkIssued ? '#F2FBF5' : '#fff', color: linkIssued ? '#178A48' : '#141414', fontSize: 15, fontWeight: 800, height: 54, borderRadius: 14, fontFamily: 'inherit' }}>
                        <Icon name={linkIssued ? 'circle-check' : 'share'} size={20} />{linkIssued ? 'لینک ساخته شد (ساخت دوباره)' : 'گرفتن لینک ضبط برای مالک'}
                      </button>
                    </div>
                    {ownerLink && (
                      <div style={{ marginTop: 12, background: '#FAFAFA', border: '1px solid #EEE', borderRadius: 14, padding: 14 }}>
                        <div style={{ fontSize: 13, color: '#666', lineHeight: 1.9 }}>این لینک را کپی کنید و برای مالک بفرستید. ساخت دوباره لینک، لینک قبلی را باطل می‌کند.</div>
                        <div dir="ltr" style={{ marginTop: 8, padding: '10px 12px', background: '#fff', border: '1px solid #E6E6E6', borderRadius: 10, fontSize: 14, fontWeight: 700, wordBreak: 'break-all' }}>{ownerLink.url}</div>
                        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button onClick={copyLink} type="button" style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #141414', background: '#fff', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}><Icon name={copied ? 'check' : 'copy'} size={16} />{copied ? 'کپی شد' : 'کپی لینک'}</button>
                          <a href={`https://wa.me/?text=${encodeURIComponent(`ویدیوی رضایت مالک خودرو را از این لینک ضبط کنید: ${ownerLink.url}`)}`} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #22A45D', color: '#178A48', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontWeight: 800 }}><Icon name="brand-whatsapp" size={16} />ارسال در واتساپ</a>
                        </div>
                      </div>
                    )}
                    {err && step === 4 && have('selfie_video') && owner && !(rel != null && ownerProofOk(rel, haveSet, linkIssued)) && <div style={{ marginTop: 8, fontSize: 13, color: '#E0371F' }}>{authReq ? 'برای این مالک یا وکالت‌نامه/رضایت‌نامه/اجاره‌نامه را در مرحلهٔ مدارک بفرستید، یا ویدیوی رضایت مالک را همین‌جا ضبط کنید (فقط لینک کافی نیست).' : 'ویدیو رضایت مالک را بارگذاری کنید یا لینک ضبط را بگیرید.'}</div>}
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <div data-pane="">
                <h2 style={h2}>محل سکونت و محدوده فعالیت</h2>
                <p style={sub}>بارهای شهر محل سکونت و شهرهای انتخابی برای شما ارسال می‌شود.</p>
                <div data-g2="" style={{ ...grid2, marginTop: 24 }}>
                  {([['استان', prov, (v: string) => { const c = PROVINCES[v]![0]!; setProv(v); setCity(c); setServe([c]); }, Object.keys(PROVINCES)], ['شهر', city, (v: string) => { setCity(v); setServe((s) => (s.includes(v) ? s : [...s, v])); }, cities]] as const).map(([label, value, set, options]) => (
                    <div key={label}>
                      <label style={lab}>{label} {star}</label>
                      <div style={{ position: 'relative', marginTop: 8 }}>
                        <select data-field="" value={value} onChange={(e) => set(e.target.value)} style={{ appearance: 'none', WebkitAppearance: 'none', width: '100%', height: 54, border: '1.5px solid #ECECEC', background: '#FAFAFA', borderRadius: 14, padding: '0 16px 0 40px', fontSize: 15, color: '#141414', cursor: 'pointer' }}>
                          {options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                        <Icon name="chevron-down" size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#999', pointerEvents: 'none' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <label style={{ ...lab, marginTop: 16 }}>آدرس محل سکونت {star}</label>
                <textarea data-field="" rows={2} value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="خیابان، کوچه، پلاک" style={{ marginTop: 8, width: '100%', border: `1.5px solid ${bad(addr.trim().length <= 5) ? '#E0371F' : '#ECECEC'}`, background: '#FAFAFA', borderRadius: 14, padding: '14px 16px', fontSize: 15, color: '#141414', resize: 'vertical', lineHeight: 1.9 }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 18, fontSize: 14, fontWeight: 700, color: '#222' }}><Icon name="map-2" size={19} style={{ color: '#FF5B0F' }} />محل سکونت روی نقشه <span style={{ color: '#999', fontWeight: 500 }}>(ساده‌ترین راه)</span></label>
                <div style={{ marginTop: 8 }}>
                  <MapPicker {...(geo ? { lat: geo.lat, lng: geo.lng } : {})} height={340} onPick={(p) => { setGeo({ lat: p.lat, lng: p.lng }); setAddr((a) => (a.trim().length > 5 ? a : p.address || a)); }} />
                </div>
                <div style={{ marginTop: 16, maxWidth: 320 }}>
                  <Field label="کد پستی (اختیاری)" value={postal} onChange={setPostal} ph="۱۰ رقم" num={10} dir="ltr" />
                </div>
                <label style={{ ...lab, marginTop: 20 }}>شهرهای قابل سرویس‌دهی</label>
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {cities.map((c) => {
                    const on = serve.includes(c);
                    return (
                      <button key={c} data-chip2="" data-active={on ? '1' : '0'} type="button" onClick={() => setServe((s) => (c === city ? s : on ? s.filter((x) => x !== c) : [...s, c]))} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #ECECEC', background: '#fff', borderRadius: 999, padding: '9px 16px', fontSize: 14, fontWeight: 700, color: '#333', cursor: 'pointer', fontFamily: 'inherit' }}><Icon name={on ? 'check' : 'plus'} size={15} />{c}</button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 6 && (
              <div data-pane="">
                <h2 style={h2}>بازبینی و ارسال</h2>
                <p style={sub}>پیش از ارسال، اطلاعات را بررسی کنید.</p>
                <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
                  {summary.map((r) => <div key={r.k} style={{ background: '#FAFAFA', border: '1px solid #F0F0F0', borderRadius: 14, padding: '14px 16px' }}><div style={{ fontSize: 12, color: '#999', fontWeight: 600 }}>{r.k}</div><div style={{ marginTop: 4, fontSize: 14, fontWeight: 800, color: '#222', lineHeight: 1.8 }}>{r.v}</div></div>)}
                </div>
                <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {Object.values(docs).filter((d) => !!d?.url && d.image).map((d, i) => <div key={i} style={{ width: 86, height: 60, borderRadius: 10, background: `#EEE center/cover url('${d!.url}')`, border: '1px solid #E5E5E5' }} />)}
                </div>
                <label style={{ marginTop: 22, display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, lineHeight: 1.9, color: '#444', cursor: 'pointer' }}>
                  <input type="checkbox" checked={agree} onChange={() => setAgree(!agree)} style={{ width: 20, height: 20, accentColor: '#FF5B0F', marginTop: 3, flex: 'none' }} />
                  صحت اطلاعات و مدارک را تایید می‌کنم و قوانین حمل بار، رعایت نکات برگ حمل و تحویل سالم بار را می‌پذیرم.{owner ? ' همچنین تایید می‌کنم مالک خودرو از این همکاری آگاه و راضی است و اطلاعات مالک صحیح است.' : ''}
                </label>
                {err && !agree && <div style={{ marginTop: 8, fontSize: 13, color: '#E0371F' }}>برای ارسال، تایید قوانین الزامی است.</div>}
              </div>
            )}

            {step === 7 && (
              <div data-pane="" style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ width: 100, height: 100, margin: '0 auto', borderRadius: '50%', background: '#FF5B0F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 12px #FFF0E8,0 20px 40px rgba(255,91,15,.35)', animation: 'hmpop .7s cubic-bezier(.2,.8,.2,1) both' }}><Icon name="file-check" size={50} /></div>
                <h2 style={{ margin: '30px 0 0', fontSize: 26, fontWeight: 900, color: '#141414' }}>درخواست شما ثبت شد</h2>
                <p style={{ margin: '10px auto 0', fontSize: 15, color: '#666', lineHeight: 2, maxWidth: 460 }}>مدارک شما توسط تیم های مصالح بررسی می‌شود. نتیجه از طریق پیامک و پنل راننده اطلاع داده می‌شود.</p>
                <div style={{ margin: '28px auto 0', maxWidth: 520, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                  <div style={{ padding: '14px 8px', borderRadius: 14, background: '#141414', color: '#fff', fontSize: 13, fontWeight: 700 }}><Icon name="check" size={20} style={{ color: '#FF5B0F', display: 'block', margin: '0 auto 4px' }} />ثبت مدارک</div>
                  <div style={{ padding: '14px 8px', borderRadius: 14, background: '#FFF0E8', color: '#FF5B0F', fontSize: 13, fontWeight: 700, border: '1.5px solid #FF5B0F' }}><Icon name="loader-2" size={20} className="hm-spin" style={{ display: 'block', margin: '0 auto 4px' }} />در حال بررسی</div>
                  <div style={{ padding: '14px 8px', borderRadius: 14, background: '#F4F4F4', color: '#999', fontSize: 13, fontWeight: 700 }}><Icon name="truck" size={20} style={{ display: 'block', margin: '0 auto 4px' }} />دریافت بار</div>
                </div>
                <a data-btn="" href="/driver" style={{ marginTop: 30, display: 'inline-flex', alignItems: 'center', gap: 10, background: '#FF5B0F', color: '#fff', fontSize: 16, fontWeight: 800, padding: '17px 32px', borderRadius: 14, boxShadow: '0 14px 30px rgba(255,91,15,.35)' }}><Icon name="steering-wheel" size={20} />ورود به پنل راننده</a>
              </div>
            )}

            {step <= 6 && (
              <div data-wiz-nav="" style={{ marginTop: 32, paddingTop: 22, borderTop: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <button data-btn="" onClick={() => { setStep(Math.max(1, step - 1)); setErr(false); }} type="button" style={{ border: '1.5px solid #E2E2E2', background: '#fff', color: '#333', fontSize: 15, fontWeight: 700, padding: '14px 22px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, opacity: step === 1 ? 0.4 : 1, pointerEvents: step === 1 ? 'none' : 'auto', fontFamily: 'inherit' }}><Icon name="arrow-right" size={18} />مرحله قبل</button>
                <span style={{ fontSize: 13, color: '#999' }}>مرحله {toFaDigits(step)} از ۶</span>
                <button data-btn="" onClick={next} type="button" disabled={busy} style={{ border: 'none', background: '#FF5B0F', color: '#fff', fontSize: 15, fontWeight: 800, padding: '15px 28px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 12px 26px rgba(255,91,15,.3)', fontFamily: 'inherit' }}>
                  {busy && <Icon name="loader-2" size={18} className="hm-spin" />}{step === 6 ? 'ارسال برای بررسی' : 'مرحله بعد'}<Icon name="chevron-left" size={17} />
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function VideoBlock({ script, scriptTitle, kind, doc, locked, onPick, bad, badText }: { script: string; scriptTitle: string; kind: KycKind; doc?: Doc; locked?: boolean; onPick: (f: File) => void; bad?: boolean; badText: string }) {
  const rejected = doc?.status === 'rejected';
  const pick = (e: ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; };
  return (
    <div data-g2="" style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20, alignItems: 'stretch' }}>
      <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', background: '#141414', aspectRatio: '3/4', maxHeight: 460, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {doc?.url ? <video src={doc.url} controls playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', background: '#000' }} /> : (
          <div style={{ textAlign: 'center', color: '#fff', padding: 20 }}>
            <div style={{ width: 130, height: 170, margin: '0 auto', border: '2.5px dashed rgba(255,255,255,.35)', borderRadius: '50% 50% 46% 46%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="user" size={54} style={{ color: 'rgba(255,255,255,.4)' }} /></div>
            <div style={{ marginTop: 16, fontSize: 14, color: '#BBB' }}>{doc ? 'ویدیوی ارسال‌شده' : 'چهره را داخل کادر قرار دهید'}</div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: '#FFF8F4', border: '1px dashed #F1C3AC', borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#141414', display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="quote" size={18} style={{ color: '#FF5B0F' }} />{scriptTitle}</div>
          <div style={{ marginTop: 10, fontSize: 15, lineHeight: 2.1, color: '#333' }}>{script}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: '#666' }}>
          {['نور کافی و پس‌زمینه ساده', 'بدون عینک آفتابی و کلاه', 'کارت ملی خوانا کنار صورت'].map((t) => <div key={t} style={{ display: 'flex', gap: 8 }}><Icon name="check" size={16} style={{ color: '#1F9D55' }} />{t}</div>)}
        </div>
        {doc?.status && <div style={{ fontSize: 13, fontWeight: 700, color: rejected ? '#C8341E' : doc.status === 'approved' ? '#178A48' : '#B57F00' }}>{rejected ? `رد شد: ${doc.reason ?? ''}` : doc.status === 'approved' ? 'تایید شد' : 'در انتظار بررسی'}</div>}
        <label data-btn="" style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#FF5B0F', color: '#fff', fontSize: 15, fontWeight: 800, height: 54, borderRadius: 14, cursor: locked ? 'not-allowed' : 'pointer', opacity: locked || doc?.busy ? 0.6 : 1 }}>
          <input type="file" accept="video/*" capture="user" disabled={locked || doc?.busy} onChange={pick} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
          <Icon name={doc?.busy ? 'loader-2' : 'video'} size={20} className={doc?.busy ? 'hm-spin' : undefined} />{doc ? 'ضبط دوباره ویدیو' : 'ضبط ویدیو با دوربین'}
        </label>
        <label data-btn="" data-hv="invert-dark" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1.5px solid #141414', color: '#141414', fontSize: 15, fontWeight: 700, height: 52, borderRadius: 14, cursor: locked ? 'not-allowed' : 'pointer' }}>
          <input type="file" accept="video/*" disabled={locked || doc?.busy} onChange={pick} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
          <Icon name="upload" size={19} />انتخاب از گالری
        </label>
        {bad && <div style={{ fontSize: 13, color: '#E0371F' }}>{badText}</div>}
        <span hidden>{kind}</span>
      </div>
    </div>
  );
}

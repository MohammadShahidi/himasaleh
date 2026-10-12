'use client';

// Port of design/project/driver-panel.dc.html, wired to the API. Steps are saved on the phone first (offline queue) and sent when online.
import { toFaDigits } from '@hm/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/icon';
import { MapPicker } from '@/components/map-picker';
import { RoleSwitch } from '@/components/role-switch';
import { WaybillCard, type WaybillData } from '@/components/waybill-card';
import { ApiError, api } from '@/lib/api';
import { type AppUpdate, appUpdateStatus, initNativePush } from '@/lib/native-bridge';
import { pendingSteps, queueStep, syncQueue } from '@/lib/offline-queue';
import { useSession } from '@/lib/session';
import { SITE, telHref } from '@/lib/site';

interface Me { profile: null | { status: 'draft' | 'submitted' | 'needs_fix' | 'approved' | 'blocked'; firstName: string; lastName: string; city: string | null; online: boolean; lat: number | null; lng: number | null; vehicle: null | { plate1: string; plateLetter: string; plate2: string; plate3: string } } }
interface Offer { id: string; goods: string; weight: string | null; from: string; to: string; distance: string | null; when: string | null; netWords: string; expiresAt: string }
interface Trip {
  id: string; step: number; goods: string; weight: string | null; notes: string[];
  from: { title: string; addr: string; phone: string | null }; to: { title: string; addr: string; contact: string | null; phone: string | null };
  money: { netWords: string; grossWords: string; feeWords: string }; waybill: WaybillData;
}
interface Wallet { balanceWords: string; balanceRial: string; tripsDone: number; entries: { id: string; amountText: string; credit: boolean; title: string }[] }

const STEP_META: { icon: IconName; short: string; title: string; btn: string }[] = [
  { icon: 'navigation', short: 'برو بار', title: 'برو سر بار', btn: 'رسیدم سر بار' },
  { icon: 'packages', short: 'بار بزن', title: 'با فروشنده بار را بشمار، عکس بگیر', btn: 'بار زدم، راه افتادم' },
  { icon: 'truck', short: 'برو مقصد', title: 'برو به مقصد', btn: 'رسیدم مقصد' },
  { icon: 'signature', short: 'تحویل', title: 'بار را تحویل بده و امضا بگیر', btn: 'تحویل دادم' },
];

const RULE_ICON: [RegExp, IconName, string, string][] = [
  [/برزنت/, 'tent', '#E8EFFD', '#1E4FD8'], [/بشمار/, 'list-numbers', '#FFF0E8', '#E4500A'], [/نقد/, 'cash', '#E6F6EC', '#178A48'], [/امضا/, 'signature', '#F0F0F0', '#444'],
];

function say(t: string) {
  try { const u = new SpeechSynthesisUtterance(t); u.lang = 'fa-IR'; u.rate = 0.9; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch { /* no speech support */ }
}

function position(): Promise<{ lat: number; lng: number } | undefined> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(undefined);
    navigator.geolocation.getCurrentPosition((p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }), () => resolve(undefined), { timeout: 4000, maximumAge: 60_000 });
  });
}

const bigBtn = { cursor: 'pointer', fontFamily: 'inherit' } as const;
const whiteCard = { background: '#fff', borderRadius: 26, padding: 20 } as const;

export function DriverPanel() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, forbidden } = useSession(['driver']);
  const [tab, setTab] = useState(0);
  const [tick, setTick] = useState(0);
  const [online, setOnline] = useState(true);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoErr, setPhotoErr] = useState(false);
  const [wb, setWb] = useState(false);
  const [toast, setToast] = useState('');
  const [net, setNet] = useState(true);
  const [queued, setQueued] = useState<{ tripId: string; step: number }[]>([]);
  const [delivered, setDelivered] = useState(false);
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const stopRef = useRef(false);

  const enabled = !!user && !forbidden;
  const me = useQuery({ queryKey: ['drv-me'], queryFn: () => api<Me>('/drivers/me'), enabled, refetchInterval: 30_000 });
  const status = me.data?.profile?.status;
  const approved = status === 'approved';
  const offers = useQuery({ queryKey: ['drv-offers'], queryFn: () => api<{ online: boolean; offers: Offer[] }>('/driver/offers'), enabled: enabled && approved, refetchInterval: 20_000 });
  const tripQ = useQuery({ queryKey: ['drv-trip'], queryFn: () => api<{ trip: Trip | null }>('/driver/trip'), enabled: enabled && approved, refetchInterval: 20_000 });
  const walletQ = useQuery({ queryKey: ['drv-wallet'], queryFn: () => api<Wallet>('/driver/wallet'), enabled: enabled && approved && tab === 2 });

  useEffect(() => { if (offers.data) setOnline(offers.data.online); }, [offers.data]);
  useEffect(() => { const t = setInterval(() => setTick((x) => x + 1), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { if (me.data && !me.data.profile) router.replace('/driver/register'); else if (status === 'draft' || status === 'needs_fix') router.replace('/driver/register'); }, [me.data, status, router]);

  const refreshQueue = useCallback(async () => setQueued((await pendingSteps()).map((r) => ({ tripId: r.tripId, step: r.step }))), []);
  const flush = useCallback(async () => {
    const r = await syncQueue();
    await refreshQueue();
    if (r.sent || r.dropped.length) { await qc.invalidateQueries({ queryKey: ['drv-trip'] }); await qc.invalidateQueries({ queryKey: ['drv-wallet'] }); }
    if (r.dropped.length) setToast('این سفر تغییر کرده یا لغو شده است.');
  }, [qc, refreshQueue]);

  // Connectivity, push registration and periodic flush of the offline queue.
  useEffect(() => {
    if (!enabled) return;
    setNet(navigator.onLine);
    const on = () => { setNet(true); void flush(); };
    const off = () => setNet(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    void refreshQueue(); void flush();
    void initNativePush((p) => router.push(p));
    void appUpdateStatus().then(setUpdate);
    const t = setInterval(() => { if (navigator.onLine) void flush(); }, 20_000);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); clearInterval(t); stopRef.current = true; try { speechSynthesis.cancel(); } catch { /* none */ } };
  }, [enabled, flush, refreshQueue, router]);

  const trip = tripQ.data?.trip ?? null;
  const queuedMax = trip ? Math.max(0, ...queued.filter((q) => q.tripId === trip.id).map((q) => q.step)) : 0;
  const step = trip ? Math.max(trip.step, queuedMax + 1) : 1; // 1–4 in progress, 5 = done
  const waiting = queued.length;

  const toggle = useMutation({
    mutationFn: (v: boolean) => api('/driver/status', { method: 'PUT', json: { online: v } }),
    onMutate: (v) => setOnline(v),
    onError: (e) => { setOnline((o) => !o); setToast(e instanceof ApiError ? e.message : 'اینترنت ندارید؛ دوباره امتحان کنید.'); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['drv-offers'] }),
  });
  const accept = useMutation({
    mutationFn: (id: string) => api('/driver/offers/' + id + '/accept', { method: 'POST' }),
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['drv-trip'] }); await qc.invalidateQueries({ queryKey: ['drv-offers'] }); setDelivered(false); setTab(0); window.scrollTo(0, 0); },
    onError: async (e) => { setToast(e instanceof ApiError ? e.message : 'اینترنت ندارید؛ دوباره امتحان کنید.'); await qc.invalidateQueries({ queryKey: ['drv-offers'] }); },
  });
  const reject = useMutation({ mutationFn: (id: string) => api('/driver/offers/' + id + '/reject', { method: 'POST' }), onSuccess: () => qc.invalidateQueries({ queryKey: ['drv-offers'] }) });
  const logout = useMutation({ mutationFn: () => api('/auth/logout', { method: 'POST' }), onSuccess: () => { qc.clear(); router.replace('/login'); } });
  const saveLoc = useMutation({
    mutationFn: (p: { lat: number; lng: number; address: string }) => api('/driver/location', { method: 'PUT', json: { lat: p.lat, lng: p.lng, ...(p.address ? { address: p.address } : {}) } }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['drv-me'] }); setToast('محل سکونت ثبت شد.'); setTab(0); window.scrollTo(0, 0); },
  });

  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 4500); return () => clearTimeout(t); }, [toast]);

  const advance = async () => {
    if (!trip) return;
    if (step === 4 && !photo) { say('اول از برگ حمل امضا شده عکس بگیر.'); setPhotoErr(true); return; }
    const pos = await position();
    await queueStep({ tripId: trip.id, step, ...(pos ?? {}), ...(step === 4 && photo ? { photo } : {}) });
    setPhoto(null); setPhotoErr(false);
    if (step === 4) setDelivered(true);
    await refreshQueue();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (navigator.onLine) void flush();
  };

  const stepView = useMemo(() => {
    if (!trip || step > 4) return null;
    const m = STEP_META[step - 1]!;
    const atSeller = step <= 2;
    const place = atSeller ? trip.from.title.split('—')[0]!.trim() : step === 3 ? trip.to.title : (trip.to.contact ?? trip.to.title);
    const addr = step === 2 ? `${trip.goods} — با فروشنده بشمار، عکس بگیر، برزنت بکش، برگ حمل بگیر` : step === 4 ? 'بار را با صاحب بار بشمار، برگ حمل را امضا کند و از آن عکس بگیر' : atSeller ? trip.from.addr : trip.to.addr;
    const tel = atSeller ? trip.from.phone : trip.to.phone;
    const mapAddr = atSeller ? trip.from.addr : trip.to.addr;
    const sayText = step === 1 ? `قدم اول. برو سر بار. ${place}. ${trip.from.addr}. وقتی رسیدی دکمه سبز را بزن.`
      : step === 2 ? `قدم دوم. ${trip.goods} بار بزن. با فروشنده بشمار و از بار عکس بگیر. روی بار برزنت بکش و برگ حمل بگیر.`
      : step === 3 ? `قدم سوم. برو به ${trip.to.addr}. وقتی رسیدی دکمه سبز را بزن.`
      : 'قدم آخر. بار را با صاحب بار بشمار. برگ حمل را امضا کند. از آن عکس بگیر و دکمه سبز را بزن. پول شما بعد از تحویل به کیف پول می‌آید.';
    return { ...m, place, addr, tel, telLabel: atSeller ? 'زنگ به انبار' : 'زنگ به صاحب بار', placeIcon: (atSeller ? 'building-store' : 'flag') as IconName, placeColor: atSeller ? '#FF5B0F' : '#178A48', map: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapAddr)}`, sayText };
  }, [trip, step]);

  if (!user || me.isLoading) return <main style={{ padding: 24, textAlign: 'center', color: '#888' }}>در حال بارگذاری…</main>;
  if (forbidden) { router.replace('/account'); return null; }

  const p = me.data?.profile;
  const pl = p?.vehicle;
  const nOpen = offers.data?.offers.length ?? 0;
  const pending = status === 'submitted';
  const locked = pending || !online;
  const showDone = delivered && !trip;

  if (update?.required) {
    return (
      <main dir="rtl" style={{ minHeight: '100dvh', background: '#141414', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24, gap: 16 }}>
        <Icon name="refresh" size={64} style={{ color: '#FF5B0F' }} />
        <div style={{ fontSize: 26, fontWeight: 900 }}>نسخهٔ تازه آمده است</div>
        <div style={{ fontSize: 18, lineHeight: 1.9, color: '#CCC', maxWidth: 360 }}>برای ادامه، اپ را به‌روز کنید.</div>
        {update.storeUrl && <a data-big="" href={update.storeUrl} style={{ marginTop: 8, height: 72, minWidth: 260, borderRadius: 20, background: '#FF5B0F', color: '#fff', fontSize: 21, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>به‌روزرسانی</a>}
      </main>
    );
  }

  const tabs: [IconName, string][] = [['truck', 'بار من'], ['bell-ringing', 'بار جدید'], ['wallet', 'پول من'], ['headset', 'کمک']];

  return (
    <div dir="rtl" style={{ background: '#EDEDED', minHeight: '100vh' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', minHeight: '100vh', background: '#F6F6F6', position: 'relative', paddingBottom: 'calc(110px + env(safe-area-inset-bottom))' }}>
        <div style={{ padding: 'calc(8px + env(safe-area-inset-top)) 10px 0', background: '#141414' }}><RoleSwitch user={user} radius={16} /></div>
        <header style={{ position: 'sticky', top: 0, zIndex: 20, background: '#141414', color: '#fff', padding: 'calc(14px + env(safe-area-inset-top)) 18px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 52, height: 52, flex: 'none', borderRadius: '50%', background: '#FF5B0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="steering-wheel" size={28} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p ? `${p.firstName} ${p.lastName}` : ''}</div>
            {pl && (
              <div dir="ltr" style={{ marginTop: 4, display: 'inline-flex', alignItems: 'stretch', height: 28, border: '2px solid #fff', borderRadius: 5, overflow: 'hidden', background: '#fff', color: '#141414', fontWeight: 900 }}>
                <div style={{ width: 16, background: '#1E4FD8' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 7px', fontSize: 15 }}>{toFaDigits(pl.plate1)}<span style={{ fontSize: 13 }}>{pl.plateLetter}</span>{toFaDigits(pl.plate2)}</div>
                <div style={{ borderLeft: '2px solid #141414', padding: '0 6px', display: 'flex', alignItems: 'center', fontSize: 13 }}>{toFaDigits(pl.plate3)}</div>
              </div>
            )}
          </div>
          {approved && (
            <button data-big="" onClick={() => toggle.mutate(!online)} aria-label="وضعیت کار" style={{ ...bigBtn, height: 56, minWidth: 108, border: 'none', borderRadius: 16, background: online ? '#22A45D' : '#666', color: '#fff', fontSize: 16, fontWeight: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}>
              <Icon name={online ? 'player-play' : 'player-pause'} size={22} />{online ? 'سر کارم' : 'استراحت'}
            </button>
          )}
        </header>

        {(!net || waiting > 0) && (
          <div style={{ margin: '12px 16px 0', background: '#FFF6E0', border: '1.5px solid #E4A10A', borderRadius: 16, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 16, fontWeight: 800, color: '#7A5600', lineHeight: 1.7 }}>
            <Icon name={net ? 'refresh' : 'wifi-off'} size={26} />
            {!net ? 'اینترنت ندارید. دکمه‌ها ذخیره می‌شود و با وصل شدن اینترنت خودش فرستاده می‌شود.' : `${toFaDigits(waiting)} قدم در حال ارسال است…`}
          </div>
        )}
        {toast && <div style={{ margin: '12px 16px 0', background: '#22A45D', color: '#fff', borderRadius: 20, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 18, fontWeight: 900 }}><Icon name="circle-check" size={28} />{toast}</div>}

        {pending && (
          <div style={{ margin: 16, background: '#FFF3EC', border: '2px solid #FF5B0F', borderRadius: 22, padding: 20, textAlign: 'center' }}>
            <Icon name="hourglass-high" size={52} style={{ color: '#FF5B0F' }} />
            <div style={{ marginTop: 8, fontSize: 22, fontWeight: 900 }}>مدارک شما در حال بررسی است</div>
            <div style={{ marginTop: 6, fontSize: 17, color: '#555', lineHeight: 1.9 }}>وقتی تایید شد، پیامک می‌آید.</div>
          </div>
        )}
        {status === 'blocked' && <div style={{ margin: 16, background: '#FDECEA', border: '2px solid #E0371F', borderRadius: 22, padding: 20, textAlign: 'center', fontSize: 19, fontWeight: 900, lineHeight: 1.9 }}>حساب شما مسدود است. با پشتیبانی تماس بگیرید.</div>}

        {approved && tab === 0 && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {showDone ? (
              <div style={{ background: '#fff', borderRadius: 26, padding: '30px 20px', textAlign: 'center' }}>
                <div style={{ width: 110, height: 110, margin: '0 auto', borderRadius: '50%', background: '#22A45D', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'hmpop .7s cubic-bezier(.2,.8,.2,1) both' }}><Icon name="check" size={64} /></div>
                <div style={{ marginTop: 20, fontSize: 26, fontWeight: 900 }}>بار تحویل شد. دستتان درد نکند!</div>
                <div style={{ marginTop: 8, fontSize: 18, color: '#555', lineHeight: 1.9 }}>بار بعدی را از دکمه «بار جدید» پایین صفحه بگیرید.</div>
                <button data-big="" onClick={() => { setDelivered(false); setTab(1); }} style={{ ...bigBtn, marginTop: 20, width: '100%', height: 76, border: 'none', borderRadius: 22, background: '#FF5B0F', color: '#fff', fontSize: 22, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}><Icon name="bell-ringing" size={30} />دیدن بارهای جدید</button>
              </div>
            ) : !trip || !stepView ? (
              <div style={{ background: '#fff', borderRadius: 26, padding: '30px 20px', textAlign: 'center' }}>
                <Icon name="truck" size={56} style={{ color: '#BBB' }} />
                <div style={{ marginTop: 10, fontSize: 20, fontWeight: 900, lineHeight: 1.8 }}>الان باری ندارید</div>
                <button data-big="" onClick={() => setTab(1)} style={{ ...bigBtn, marginTop: 16, width: '100%', height: 72, border: 'none', borderRadius: 20, background: '#FF5B0F', color: '#fff', fontSize: 21, fontWeight: 900 }}>دیدن بارهای جدید</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {STEP_META.map((m, i) => (
                    <div key={m.short} data-step-b="" data-st={i + 1 < step ? 'done' : i + 1 === step ? 'cur' : 'todo'} style={{ borderRadius: 16, background: '#fff', color: '#999', padding: '10px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, textAlign: 'center' }}>
                      <Icon name={m.icon} size={28} /><span style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.4 }}>{m.short}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#fff', borderRadius: 26, padding: 22, boxShadow: '0 10px 30px rgba(0,0,0,.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#FF5B0F' }}>قدم {toFaDigits(step)} از ۴</span>
                    <button data-big="" onClick={() => say(stepView.sayText)} aria-label="گوش بده" style={{ ...bigBtn, height: 48, border: 'none', borderRadius: 14, background: '#F1F1F1', color: '#141414', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, padding: '0 14px' }}><Icon name="volume" size={22} />گوش بده</button>
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ width: 72, height: 72, flex: 'none', borderRadius: 22, background: '#FFF0E8', color: '#FF5B0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={stepView.icon} size={40} /></span>
                    <div style={{ fontSize: 24, fontWeight: 900, lineHeight: 1.5 }}>{stepView.title}</div>
                  </div>
                  <div style={{ marginTop: 14, background: '#F6F6F6', borderRadius: 18, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Icon name={stepView.placeIcon} size={32} style={{ color: stepView.placeColor }} />
                    <div style={{ minWidth: 0 }}><div style={{ fontSize: 19, fontWeight: 900 }}>{stepView.place}</div><div style={{ marginTop: 2, fontSize: 16, color: '#666', lineHeight: 1.8 }}>{stepView.addr}</div></div>
                  </div>
                  <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: stepView.tel ? '1fr 1fr' : '1fr', gap: 10 }}>
                    <a data-big="" href={stepView.map} target="_blank" rel="noopener" style={{ height: 64, borderRadius: 18, background: '#1E4FD8', color: '#fff', fontSize: 18, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Icon name="map-2" size={26} />مسیریابی</a>
                    {stepView.tel && <a data-big="" href={telHref(stepView.tel)} style={{ height: 64, borderRadius: 18, background: '#141414', color: '#fff', fontSize: 18, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Icon name="phone" size={26} />{stepView.telLabel}</a>}
                  </div>
                  {step === 4 && (
                    <label data-big="" style={{ marginTop: 12, height: 72, borderRadius: 18, border: `3px dashed ${photoErr && !photo ? '#E0371F' : photo ? '#22A45D' : '#CCC'}`, background: photo ? '#F2FBF5' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 18, fontWeight: 900, color: '#141414', cursor: 'pointer' }}>
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPhoto(f); setPhotoErr(false); } e.target.value = ''; }} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
                      <Icon name={photo ? 'circle-check' : 'camera'} size={30} style={{ color: '#FF5B0F' }} />{photo ? 'عکس گرفته شد' : 'عکس برگ حمل امضا شده'}
                    </label>
                  )}
                  <button data-big="" onClick={advance} style={{ ...bigBtn, marginTop: 12, width: '100%', height: 84, border: 'none', borderRadius: 22, background: '#22A45D', color: '#fff', fontSize: 24, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, boxShadow: '0 14px 30px rgba(34,164,93,.35)', opacity: step === 4 && !photo ? 0.5 : 1 }}><Icon name="circle-check" size={34} />{stepView.btn}</button>
                </div>

                <div style={whiteCard}>
                  <div style={{ fontSize: 20, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="package" size={26} style={{ color: '#FF5B0F' }} />بار شما</div>
                  <div style={{ marginTop: 12, fontSize: 22, fontWeight: 900 }}>{trip.goods}</div>
                  {trip.weight && <div style={{ marginTop: 4, fontSize: 18, color: '#555' }}>{trip.weight}</div>}
                  {trip.notes.length > 0 && <div style={{ marginTop: 16, fontSize: 18, fontWeight: 900 }}>یادتان باشد</div>}
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {trip.notes.map((t) => {
                      const r = RULE_ICON.find(([re]) => re.test(t)) ?? [/./, 'check' as IconName, '#F0F0F0', '#444'];
                      return (
                        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#F6F6F6', borderRadius: 16, padding: '12px 14px' }}>
                          <span style={{ width: 50, height: 50, flex: 'none', borderRadius: 14, background: r[2], color: r[3], display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={r[1]} size={28} /></span>
                          <span style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.7 }}>{t}</span>
                        </div>
                      );
                    })}
                  </div>
                  <button data-big="" onClick={() => setWb(true)} style={{ ...bigBtn, marginTop: 14, width: '100%', height: 60, border: '2px solid #E2E2E2', background: '#fff', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 18, fontWeight: 900, color: '#1E4FD8' }}><Icon name="file-invoice" size={24} />دیدن برگ حمل کامل</button>
                </div>

                <div style={{ background: '#141414', color: '#fff', borderRadius: 26, padding: 20 }}>
                  <div style={{ fontSize: 17, color: '#BBB' }}>بعد از تحویل به کیف پول شما می‌آید</div>
                  <div style={{ marginTop: 6, fontSize: 32, fontWeight: 900, color: '#3DDC84' }}>{trip.money.netWords}</div>
                  <div style={{ marginTop: 10, background: 'rgba(255,255,255,.08)', borderRadius: 16, padding: 14, fontSize: 17, lineHeight: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span>کرایه این بار:</span><b>{trip.money.grossWords}</b></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, color: '#FFB48F' }}><span>سهم های مصالح:</span><b>{trip.money.feeWords}</b></div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {approved && tab === 1 && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 24, fontWeight: 900, padding: '4px 4px 0' }}>بارهای جدید {p?.city ?? ''}</div>
            {locked ? (
              <div style={{ background: '#fff', borderRadius: 24, padding: '30px 20px', textAlign: 'center' }}>
                <Icon name="moon" size={56} style={{ color: '#BBB' }} />
                <div style={{ marginTop: 10, fontSize: 20, fontWeight: 900, lineHeight: 1.8 }}>الان در حال استراحت هستید</div>
                <button data-big="" onClick={() => toggle.mutate(true)} style={{ ...bigBtn, marginTop: 16, width: '100%', height: 72, border: 'none', borderRadius: 20, background: '#22A45D', color: '#fff', fontSize: 21, fontWeight: 900 }}>سر کارم، بار می‌خواهم</button>
              </div>
            ) : nOpen === 0 ? (
              <div style={{ background: '#fff', borderRadius: 24, padding: '30px 20px', textAlign: 'center', fontSize: 19, fontWeight: 800, color: '#666', lineHeight: 1.9 }}>الان باری نیست. وقتی بار بیاید اینجا و با پیامک یا اعلان خبر می‌دهیم.</div>
            ) : offers.data!.offers.map((o) => {
              const leftSec = Math.max(0, Math.floor((new Date(o.expiresAt).getTime() - Date.now()) / 1000));
              void tick;
              return (
                <div key={o.id} style={{ background: '#fff', borderRadius: 26, padding: 20, boxShadow: '0 10px 30px rgba(0,0,0,.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 22, fontWeight: 900 }}>{o.goods}</span>
                    <button data-big="" onClick={() => say(`بار ${o.goods}. از ${o.from} به ${o.to}. پول شما ${o.netWords}.`)} aria-label="گوش بده" style={{ ...bigBtn, width: 52, height: 52, flex: 'none', border: 'none', borderRadius: 14, background: '#F1F1F1', color: '#141414', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="volume" size={24} /></button>
                  </div>
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 18 }}><span style={{ width: 44, height: 44, flex: 'none', borderRadius: 12, background: '#FFF0E8', color: '#FF5B0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="building-store" size={24} /></span><span><b>بار بزن:</b> {o.from}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'center', color: '#CCC' }}><Icon name="arrow-down" size={24} /></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 18 }}><span style={{ width: 44, height: 44, flex: 'none', borderRadius: 12, background: '#E6F6EC', color: '#178A48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="flag" size={24} /></span><span><b>ببر به:</b> {o.to}</span></div>
                  </div>
                  <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, textAlign: 'center' }}>
                    {([['weight', o.weight], ['road', o.distance], ['clock', o.when]] as const).map(([ic, v]) => <div key={ic} style={{ background: '#F6F6F6', borderRadius: 14, padding: '10px 4px' }}><Icon name={ic} size={24} style={{ color: '#666' }} /><div style={{ fontSize: 17, fontWeight: 900 }}>{v ?? '—'}</div></div>)}
                  </div>
                  <div style={{ marginTop: 14, background: '#F2FBF5', borderRadius: 18, padding: 14, textAlign: 'center' }}>
                    <div style={{ fontSize: 16, color: '#178A48', fontWeight: 700 }}>پول شما</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#178A48' }}>{o.netWords}</div>
                  </div>
                  <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                    <button data-big="" onClick={() => reject.mutate(o.id)} style={{ ...bigBtn, height: 80, border: 'none', borderRadius: 20, background: '#FDECEA', color: '#C8341E', fontSize: 20, fontWeight: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={30} />نه</button>
                    <button data-big="" disabled={accept.isPending} onClick={() => accept.mutate(o.id)} style={{ ...bigBtn, height: 80, border: 'none', borderRadius: 20, background: '#22A45D', color: '#fff', fontSize: 22, fontWeight: 900, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 26px rgba(34,164,93,.35)' }}><Icon name="check" size={32} />قبول می‌کنم</button>
                  </div>
                  <div style={{ marginTop: 8, textAlign: 'center', fontSize: 15, color: '#E4500A', fontWeight: 800 }}><Icon name="clock" size={16} /> {toFaDigits(Math.max(1, Math.ceil(leftSec / 60)))} دقیقه فرصت دارید</div>
                </div>
              );
            })}
          </div>
        )}

        {approved && tab === 2 && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#141414', color: '#fff', borderRadius: 26, padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 18, color: '#BBB' }}>پول کیف پول شما</div>
              <div style={{ marginTop: 6, fontSize: 36, fontWeight: 900, color: '#3DDC84' }}>{walletQ.data?.balanceWords ?? '…'}</div>
              <div style={{ marginTop: 8, fontSize: 16, color: '#DDD', lineHeight: 1.8 }}>کرایه بارها بعد از تحویل، منهای سهم های مصالح، به کیف پول شما می‌آید.</div>
            </div>
            <div style={whiteCard}>
              <div style={{ fontSize: 20, fontWeight: 900 }}>این ماه</div>
              <div style={{ marginTop: 12, background: '#F6F6F6', borderRadius: 16, padding: 14, textAlign: 'center' }}><Icon name="truck" size={30} style={{ color: '#FF5B0F' }} /><div style={{ fontSize: 26, fontWeight: 900 }}>{toFaDigits(walletQ.data?.tripsDone ?? 0)}</div><div style={{ fontSize: 16, color: '#666' }}>بار تحویل داده‌اید</div></div>
            </div>
            <div style={whiteCard}>
              <div style={{ fontSize: 20, fontWeight: 900 }}>آخرین پول‌ها</div>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {walletQ.data?.entries.length === 0 && <div style={{ fontSize: 16, color: '#888' }}>هنوز پولی نیامده است.</div>}
                {walletQ.data?.entries.map((e) => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#F6F6F6', borderRadius: 16, padding: '12px 14px' }}>
                    <span style={{ width: 46, height: 46, flex: 'none', borderRadius: '50%', background: e.credit ? '#22A45D' : '#E4500A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={e.credit ? 'plus' : 'minus'} size={24} /></span>
                    <span style={{ flex: 1, fontSize: 17, fontWeight: 700 }}>{e.title}</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: e.credit ? '#178A48' : '#E4500A', whiteSpace: 'nowrap' }}>{e.credit ? '+' : '−'} {e.amountText}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 3 && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {approved && (
              <div style={whiteCard}>
                <div style={{ fontSize: 21, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="map-pin" size={26} style={{ color: '#FF5B0F' }} />محل سکونت من</div>
                <div style={{ marginTop: 4, fontSize: 16, color: '#666', lineHeight: 1.8 }}>بارهای نزدیک خانه‌تان اول برای شما فرستاده می‌شود.</div>
                <div style={{ marginTop: 12 }}>
                  <MapPicker {...(p?.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : {})} height={300} confirmLabel="همین‌جاست، ذخیره کن" onPick={(x) => saveLoc.mutate(x)} />
                </div>
              </div>
            )}
            <div style={{ fontSize: 24, fontWeight: 900, padding: 4 }}>کمک لازم دارید؟</div>
            <a data-big="" href={telHref(SITE.phone)} style={{ height: 96, borderRadius: 24, background: '#22A45D', color: '#fff', fontSize: 24, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}><Icon name="phone-call" size={40} />زنگ به پشتیبانی</a>
            <a data-big="" href={SITE.socials[0]?.href} target="_blank" rel="noopener" style={{ height: 84, borderRadius: 24, background: '#fff', color: '#141414', fontSize: 21, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, border: '2px solid #E2E2E2' }}><Icon name="brand-whatsapp" size={34} style={{ color: '#22A45D' }} />پیام در واتساپ</a>
            <button onClick={() => logout.mutate()} style={{ ...bigBtn, border: 'none', background: 'none', textAlign: 'center', fontSize: 15, color: '#888', padding: 6 }}>خروج از حساب</button>
          </div>
        )}

        <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 560, zIndex: 30, background: '#fff', borderTop: '1px solid #E6E6E6', padding: '8px 8px calc(8px + env(safe-area-inset-bottom))', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, boxShadow: '0 -10px 30px rgba(0,0,0,.06)' }}>
          {tabs.map(([icon, label], i) => (
            <button key={label} data-big="" data-tabb="" data-active={tab === i ? '1' : '0'} onClick={() => { setTab(i); window.scrollTo(0, 0); }} style={{ ...bigBtn, position: 'relative', border: 'none', background: 'transparent', color: '#777', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 0', fontSize: 15, fontWeight: 900 }}>
              <span data-tab-ic="" style={{ width: 60, height: 40, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .3s' }}><Icon name={icon} size={28} /></span>{label}
              {i === 1 && nOpen > 0 && !locked && <span style={{ position: 'absolute', top: 2, right: 'calc(50% - 26px)', minWidth: 22, height: 22, borderRadius: 999, background: '#E0371F', color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>{toFaDigits(nOpen)}</span>}
            </button>
          ))}
        </nav>

        {wb && trip && (
          <div onClick={() => setWb(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(10,10,10,.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', background: '#F6F6F6', borderRadius: '26px 26px 0 0', padding: '12px 12px calc(20px + env(safe-area-inset-bottom))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px 12px' }}>
                <span style={{ flex: 1, fontSize: 21, fontWeight: 900 }}>برگ حمل</span>
                <button data-big="" onClick={() => setWb(false)} aria-label="بستن" style={{ ...bigBtn, width: 52, height: 52, border: 'none', borderRadius: 16, background: '#141414', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={26} /></button>
              </div>
              <WaybillCard data={trip.waybill} />
              <button data-big="" onClick={() => setWb(false)} style={{ ...bigBtn, marginTop: 12, width: '100%', height: 64, border: 'none', borderRadius: 18, background: '#141414', color: '#fff', fontSize: 19, fontWeight: 900 }}>بستن</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

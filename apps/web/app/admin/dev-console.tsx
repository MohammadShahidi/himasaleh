'use client';

// Test console for staff on dev and acceptance servers (the API answers 404 unless ENABLE_DEV_TOOLS is on): what a tester would
// otherwise do with SQL. Shown in /admin only when the server says it is available.
import { toFaDigits } from '@hm/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError, api } from '@/lib/api';

interface State {
  flags: { smsTestPrefix: string | null; smsProvider: string; pushProvider: string; shahkarProvider: string; nodeEnv: string };
  tunable: { key: string; default: unknown }[];
  overrides: { key: string; value: unknown }[];
  drivers: { id: string; name: string; nationalId: string; phone: string; status: string; online: boolean; city: string | null }[];
  trips: { id: string; status: string; step: number; waybillNo: string; isTest: boolean; events: { step: number; clientAt: string; serverAt: string; photo: boolean }[] }[];
  sms: { at: string; to: string; kind: string; provider: string; status: string; text: string; error: string | null }[];
  notifications: { at: string; type: string; channel: string; status: string; error: string | null; acked: boolean }[];
  audit: { at: string; action: string; entity: string }[];
  ledger: { sumRial: string; balances: { account: string; rial: string }[]; kinds: { kind: string; count: number }[] };
}

const card = { background: '#fff', border: '1px solid #EFEFEF', borderRadius: 18, padding: 16 } as const;
const btn = { border: '1.5px solid #141414', background: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' } as const;
const h3 = { margin: 0, fontSize: 16, fontWeight: 900 } as const;
const t = (iso: string) => new Date(iso).toLocaleTimeString('fa-IR');

export function useDevAvailable() {
  return useQuery({ queryKey: ['dev-state'], queryFn: () => api<State>('/dev/state'), retry: false, refetchInterval: 6000 });
}

export function DevConsole({ state }: { state: State }) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState('');
  const [driverId, setDriverId] = useState('');
  const [key, setKey] = useState(state.tunable[0]?.key ?? '');
  const [value, setValue] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['dev-state'] });
  const run = useMutation({
    mutationFn: (a: { label: string; fn: () => Promise<unknown> }) => a.fn().then((r) => ({ label: a.label, r })),
    onSuccess: ({ label, r }) => { setMsg(`${label}: ${JSON.stringify(r)}`); void refresh(); },
    onError: (e) => setMsg(e instanceof ApiError ? e.message : 'خطا'),
  });
  const act = (label: string, fn: () => Promise<unknown>) => run.mutate({ label, fn });
  const approved = state.drivers.filter((d) => d.status === 'approved');
  const def = state.tunable.find((x) => x.key === key)?.default;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ ...card, background: '#FFF8F4', borderColor: '#F1C3AC' }}>
        <div style={h3}>کنسول آزمایش</div>
        <div style={{ marginTop: 6, fontSize: 13, color: '#7A4A2A', lineHeight: 1.9 }}>
          فقط روی سرور آزمایشی روشن است. شمارهٔ آزمایشی: <b dir="ltr">{state.flags.smsTestPrefix ? `${state.flags.smsTestPrefix}…` : 'تنظیم نشده'}</b> — کد ورود این شماره‌ها در صفحهٔ <a href="/dev-otp" target="_blank" style={{ color: '#FF5B0F', fontWeight: 800 }}>/dev-otp</a> دیده می‌شود. پیامک: {state.flags.smsProvider} · اعلان: {state.flags.pushProvider} · شاهکار: {state.flags.shahkarProvider}
        </div>
        {msg && <div dir="ltr" style={{ marginTop: 8, fontSize: 12, color: '#444', wordBreak: 'break-all' }}>{msg}</div>}
      </div>

      <div style={card}>
        <div style={h3}>بار آزمایشی</div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={driverId} onChange={(e) => setDriverId(e.target.value)} aria-label="راننده" style={{ ...btn, fontWeight: 600 }}>
            <option value="">همهٔ رانندگان تاییدشدهٔ آنلاین (احتیاط)</option>
            {approved.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.phone}{d.online ? ' (آنلاین)' : ''}</option>)}
          </select>
          <button style={btn} onClick={() => act('بار آزمایشی', () => api('/dev/test-trips', { method: 'POST', json: driverId ? { driverId } : {} }))}>ارسال بار آزمایشی</button>
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={btn} onClick={() => act('منقضی کردن پیشنهادها', () => api('/dev/expire-offers', { method: 'POST' }))}>منقضی کردن پیشنهادهای باز</button>
          <button style={btn} onClick={() => act('لغو سفرها', () => api('/dev/cancel-trips', { method: 'POST' }))}>لغو سفرهای در جریان</button>
          <button style={btn} onClick={() => act('یادآوری‌ها', () => api('/dev/run-reminders', { method: 'POST' }))}>اجرای یادآوری ویدیوی مالک</button>
          <button style={btn} onClick={() => act('محدودیت‌های ورود', () => api('/dev/clear-otp-limits', { method: 'POST' }))}>پاک کردن محدودیت‌های ورود</button>
          <button style={{ ...btn, borderColor: '#C8341E', color: '#C8341E' }} onClick={() => { if (confirm('همهٔ حساب‌ها و داده‌های شماره‌های آزمایشی (به‌جز کارشناس) پاک شود؟ دفتر کل پاک نمی‌شود.')) act('پاک‌سازی', () => api('/dev/test-data', { method: 'DELETE' })); }}>پاک‌سازی داده‌های شماره‌های آزمایشی</button>
        </div>
      </div>

      <div style={card}>
        <div style={h3}>تنظیمات (جایگزین SQL)</div>
        <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={key} onChange={(e) => setKey(e.target.value)} aria-label="کلید" style={{ ...btn, fontWeight: 600 }} dir="ltr">
            {state.tunable.map((x) => <option key={x.key} value={x.key}>{x.key}</option>)}
          </select>
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder={`پیش‌فرض: ${String(def)}`} dir="ltr" style={{ ...btn, fontWeight: 500, width: 190 }} />
          <button style={btn} onClick={() => act('تنظیم', () => api('/dev/settings', { method: 'PUT', json: { key, value: typeof def === 'number' ? Number(value) : value } }))}>اعمال</button>
          <button style={btn} onClick={() => act('بازگشت به پیش‌فرض', () => api('/dev/settings', { method: 'PUT', json: { key } }))}>بازگشت به پیش‌فرض</button>
        </div>
        <div dir="ltr" style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
          {state.overrides.length ? state.overrides.map((o) => `${o.key} = ${JSON.stringify(o.value)}`).join('  ·  ') : 'بدون تغییر (همه پیش‌فرض)'}
        </div>
      </div>

      <div style={card}>
        <div style={h3}>رانندگان</div>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {state.drivers.length === 0 && <div style={{ fontSize: 13, color: '#888' }}>هنوز راننده‌ای ثبت‌نام نکرده.</div>}
          {state.drivers.map((d) => (
            <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, background: '#FAFAFA', borderRadius: 10, padding: '8px 12px', fontSize: 13 }}>
              <span>{d.name} <span dir="ltr" style={{ color: '#888' }}>{d.phone} · {d.nationalId}</span> — <b>{d.status}</b>{d.online ? ' · آنلاین' : ''}</span>
              {d.status === 'approved' && <button style={btn} onClick={() => act('مسدود', () => api('/dev/driver-status', { method: 'POST', json: { driverId: d.id, status: 'blocked' } }))}>مسدود</button>}
              {d.status === 'blocked' && <button style={btn} onClick={() => act('رفع مسدودی', () => api('/dev/driver-status', { method: 'POST', json: { driverId: d.id, status: 'approved' } }))}>رفع مسدودی</button>}
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={h3}>سفرها (زمان‌ها: ساعت گوشی ← ساعت سرور)</div>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
          {state.trips.map((tr) => (
            <div key={tr.id} style={{ background: '#FAFAFA', borderRadius: 10, padding: '8px 12px' }}>
              <b dir="ltr">{tr.waybillNo}</b> — {tr.status} (قدم {toFaDigits(tr.step)}){tr.isTest ? ' · آزمایشی' : ''}
              {tr.events.map((e) => <div key={e.step} style={{ color: '#666' }}>قدم {toFaDigits(e.step)}: {t(e.clientAt)} ← {t(e.serverAt)}{e.photo ? ' 📷' : ''}</div>)}
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={h3}>دفتر کل</div>
        <div dir="ltr" style={{ marginTop: 8, fontSize: 12, lineHeight: 1.9 }}>
          <b style={{ color: state.ledger.sumRial === '0' ? '#178A48' : '#C8341E' }}>sum(entries) = {state.ledger.sumRial}</b> (must be 0)<br />
          {state.ledger.kinds.map((k) => `${k.kind}×${k.count}`).join('  ')}<br />
          {state.ledger.balances.map((b) => `${b.account}: ${b.rial}`).join('\n').split('\n').map((l) => <div key={l}>{l}</div>)}
        </div>
      </div>

      <div style={card}>
        <div style={h3}>پیامک‌ها و اعلان‌ها</div>
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
          {state.sms.map((m, i) => <div key={i} dir="ltr" style={{ background: '#FAFAFA', borderRadius: 8, padding: '6px 10px', color: m.status === 'failed' ? '#C8341E' : '#333' }}>{t(m.at)} · {m.to} · <b>{m.kind}</b> · {m.provider}/{m.status} · {m.text.replace(/\n/g, ' ')}{m.error ? ` · ${m.error}` : ''}</div>)}
          {state.notifications.map((n, i) => <div key={i} dir="ltr" style={{ background: '#F5F8FF', borderRadius: 8, padding: '6px 10px' }}>{t(n.at)} · push {n.type} · {n.channel}/{n.status}{n.acked ? ' · acked' : ''}{n.error ? ` · ${n.error}` : ''}</div>)}
        </div>
      </div>

      <div style={card}>
        <div style={h3}>گزارش فعالیت (آخرین ۱۵)</div>
        <div dir="ltr" style={{ marginTop: 8, fontSize: 12, color: '#555', lineHeight: 1.9 }}>{state.audit.map((a, i) => <div key={i}>{t(a.at)} · {a.action} · {a.entity}</div>)}</div>
      </div>
    </div>
  );
}

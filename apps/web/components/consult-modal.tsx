'use client';

// Port of design/project/ConsultModal.dc.html. Opened anywhere with openConsult({ topic, ctx }).
import { DEFAULT_CONSULT_TOPICS, normalizeMobile, toFaDigits } from '@hm/shared';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icon';
import { ApiError, api } from '@/lib/api';

export function ConsultModal() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState('');
  const [note, setNote] = useState('');
  const [ctx, setCtx] = useState('');
  const [done, setDone] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverErr, setServerErr] = useState('');
  const [topics, setTopics] = useState<string[]>(DEFAULT_CONSULT_TOPICS);
  const [slaHours, setSlaHours] = useState(24);

  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ topic?: string; ctx?: string }>).detail ?? {};
      setOpen(true); setDone(false); setTried(false); setNote(''); setServerErr('');
      setCtx(d.ctx ?? ''); setTopic(d.topic ?? '');
      api<{ topics: string[]; slaHours: number }>('/consult/topics')
        .then((r) => { if (r.topics.length) setTopics(r.topics); setSlaHours(r.slaHours); })
        .catch(() => {});
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('hm:consult', on);
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('hm:consult', on); window.removeEventListener('keydown', esc); };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  const mobile = normalizeMobile(phone);
  const list = topic && !topics.includes(topic) ? [topic, ...topics] : topics;
  const close = () => setOpen(false);

  const submit = async () => {
    if (!mobile || !topic) return setTried(true);
    setBusy(true); setServerErr('');
    try {
      await api('/consult', { method: 'POST', json: { phone: mobile, topic, ...(ctx ? { ctx } : {}), ...(note.trim() ? { note } : {}) } });
      setDone(true);
    } catch (e) {
      setServerErr(e instanceof ApiError ? e.message : 'ارتباط برقرار نشد. اینترنت را بررسی کنید.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-cm-wrap="" dir="rtl" onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(10,10,10,.55)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', padding: 20, animation: 'hmcm-fade .3s ease both' }}>
      <div data-cm-box="" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="درخواست مشاوره" style={{ position: 'relative', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 26, padding: 22, boxShadow: '0 30px 80px rgba(0,0,0,.3)', animation: 'hmcm-up .45s cubic-bezier(.2,.8,.2,1) both', color: '#141414' }}>
        <span data-cm-grip="" style={{ display: 'none', width: 44, height: 5, borderRadius: 99, background: '#E2E2E2', margin: '-8px auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ width: 48, height: 48, flex: 'none', borderRadius: 14, background: '#FFF0E8', color: '#FF5B0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="headset" size={26} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 900 }}>درخواست مشاوره</div>
            <div style={{ fontSize: 14, color: '#888', lineHeight: 1.8 }}>شماره و موضوع را بنویسید؛ با شما تماس می‌گیریم.</div>
          </div>
          <button onClick={close} aria-label="بستن" style={{ width: 40, height: 40, flex: 'none', border: 'none', borderRadius: 12, background: '#F3F3F3', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={20} /></button>
        </div>

        {!done ? (
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {ctx && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FAFAFA', border: '1px solid #EFEFEF', borderRadius: 14, padding: '10px 12px' }}>
                <Icon name="package" size={22} style={{ color: '#FF5B0F' }} />
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, color: '#999' }}>محصول</div><div style={{ fontSize: 15, fontWeight: 800 }}>{ctx}</div></div>
              </div>
            )}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>شماره موبایل</span>
              <input data-cm-field="" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" dir="ltr" placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹"
                style={{ height: 54, border: `1.5px solid ${tried && !mobile ? '#E5776A' : '#ECECEC'}`, background: '#FAFAFA', borderRadius: 14, padding: '0 14px', fontSize: 18, fontWeight: 700, textAlign: 'right', letterSpacing: 1 }} />
              {tried && !mobile && <span style={{ fontSize: 13, color: '#C8341E', fontWeight: 700 }}>شماره موبایل ۱۱ رقمی را درست بنویسید (مثل ۰۹۱۲۳۴۵۶۷۸۹).</span>}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>موضوع</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {list.map((t) => (
                  <span key={t} data-cm-chip="" data-active={topic === t ? '1' : '0'} onClick={() => setTopic(t)} role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTopic(t); } }}
                    style={{ border: '1.5px solid #E6E6E6', background: '#fff', borderRadius: 12, padding: '10px 14px', fontSize: 14, fontWeight: 700, color: '#333' }}>{t}</span>
                ))}
              </div>
              {tried && !topic && <span style={{ fontSize: 13, color: '#C8341E', fontWeight: 700 }}>یک موضوع انتخاب کنید.</span>}
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>توضیح <span style={{ fontWeight: 500, color: '#999' }}>(اختیاری)</span></span>
              <textarea data-cm-field="" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="مثلاً مقدار، شهر یا زمان تحویل"
                style={{ border: '1.5px solid #ECECEC', background: '#FAFAFA', borderRadius: 14, padding: '12px 14px', fontSize: 15, resize: 'vertical' }} />
            </label>
            {serverErr && <span style={{ fontSize: 13, color: '#C8341E', fontWeight: 700 }}>{serverErr}</span>}
            <button onClick={submit} disabled={busy} style={{ height: 58, border: 'none', borderRadius: 16, background: '#FF5B0F', color: '#fff', fontSize: 18, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 12px 26px rgba(255,91,15,.3)', opacity: busy ? 0.7 : 1 }}>
              <Icon name={busy ? 'loader-2' : 'send'} size={20} className={busy ? 'hm-spin' : undefined} />ثبت درخواست
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 22, textAlign: 'center', padding: '10px 0 4px' }}>
            <span style={{ width: 76, height: 76, margin: '0 auto', borderRadius: '50%', background: '#E6F6EC', color: '#22A45D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="circle-check" size={44} /></span>
            <div style={{ marginTop: 14, fontSize: 20, fontWeight: 900 }}>درخواست ثبت شد</div>
            <div style={{ marginTop: 6, fontSize: 15, color: '#666', lineHeight: 1.9 }}>
              کارشناس ما تا {toFaDigits(slaHours)} ساعت با شماره <b dir="ltr">{toFaDigits(mobile ?? '')}</b> تماس می‌گیرد.
            </div>
            <button onClick={close} style={{ marginTop: 18, width: '100%', height: 54, border: '1.5px solid #141414', background: '#fff', color: '#141414', borderRadius: 16, fontSize: 16, fontWeight: 900, cursor: 'pointer' }}>باشه</button>
          </div>
        )}
      </div>
    </div>
  );
}

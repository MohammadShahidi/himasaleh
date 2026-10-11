'use client';

// Contact form of design/project/contact.dc.html. It files a «درخواست مشاوره» (POST /consult) with the message as the note,
// so the support team sees it in the same queue as the modal's requests.
import { normalizeMobile } from '@hm/shared';
import { useState } from 'react';
import { Icon } from '@/components/icon';
import { ApiError, api } from '@/lib/api';

const SUBJECTS = ['استعلام قیمت', 'ثبت سفارش', 'مشاوره فنی', 'پیگیری سفارش', 'همکاری و نمایندگی', 'انتقادات و پیشنهادات'];

const label = { display: 'block', fontSize: 14, fontWeight: 700, color: '#222' } as const;
const fieldBase = { marginTop: 8, width: '100%', background: '#FAFAFA', borderRadius: 14, fontSize: 15, color: '#141414' } as const;

export function ContactForm() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0]!);
  const [msg, setMsg] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [serverErr, setServerErr] = useState('');

  const mobile = normalizeMobile(phone);
  const okMsg = msg.trim().length > 2;
  const bad = tried && !(mobile && okMsg);

  const submit = async () => {
    if (busy) return;
    if (!mobile || !okMsg) return setTried(true);
    setBusy(true);
    setServerErr('');
    try {
      const note = `${name.trim() ? `نام: ${name.trim()}\n` : ''}${msg.trim()}`;
      await api('/consult', { method: 'POST', json: { phone: mobile, topic: subject, note } });
      setDone(true);
    } catch (e) {
      setServerErr(e instanceof ApiError ? e.message : 'ارتباط برقرار نشد. اینترنت را بررسی کنید.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div style={{ minHeight: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#FF5B0F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 12px #FFF0E8,0 20px 40px rgba(255,91,15,.35)', animation: 'hmpop .7s cubic-bezier(.2,.8,.2,1) both' }}><Icon name="check" size={50} /></div>
        <div style={{ marginTop: 30, fontSize: 24, fontWeight: 900, color: '#141414' }}>پیام شما ارسال شد</div>
        <p style={{ margin: '12px 0 0', fontSize: 15, color: '#666', lineHeight: 2 }}>به‌زودی با شما تماس می‌گیریم.</p>
        <button data-btn="" data-hv-dark="" type="button" onClick={() => { setName(''); setPhone(''); setMsg(''); setTried(false); setDone(false); }} style={{ marginTop: 24, border: '1.5px solid #141414', background: '#fff', color: '#141414', fontSize: 15, fontWeight: 700, padding: '13px 32px', borderRadius: 12 }}>ارسال پیام جدید</button>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'inline-flex', color: '#FF5B0F', fontSize: 14, fontWeight: 700, background: '#FFF0E8', padding: '7px 16px', borderRadius: 999 }}>فرم تماس</div>
      <h2 style={{ margin: '14px 0 0', fontSize: 'clamp(24px,2.6vw,32px)', fontWeight: 900, color: '#141414' }}>پیام خود را برای ما بفرستید</h2>
      <p style={{ margin: '10px 0 0', fontSize: 15, color: '#777', lineHeight: 1.9 }}>پاسخ پیام‌ها در ساعات کاری و در سریع‌ترین زمان داده می‌شود.</p>
      <div data-frow="" style={{ marginTop: 26, display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 16 }}>
        <div>
          <label htmlFor="cf-name" style={label}>نام و نام خانوادگی</label>
          <input id="cf-name" data-field="" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="مثلاً علی محمدی" style={{ ...fieldBase, height: 54, border: '1.5px solid #ECECEC', padding: '0 16px' }} />
        </div>
        <div>
          <label htmlFor="cf-phone" style={label}>شماره موبایل <span style={{ color: '#FF5B0F' }}>*</span></label>
          <input id="cf-phone" data-field="" type="tel" inputMode="numeric" autoComplete="tel" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="۰۹۱۲ ۳۴۵ ۶۷۸۹" style={{ ...fieldBase, height: 54, border: `1.5px solid ${tried && !mobile ? '#E0371F' : '#ECECEC'}`, padding: '0 16px', fontSize: 16, fontWeight: 600, textAlign: 'left' }} />
        </div>
      </div>
      <label htmlFor="cf-subject" style={{ ...label, marginTop: 16 }}>موضوع</label>
      <div style={{ position: 'relative', marginTop: 8 }}>
        <select id="cf-subject" data-field="" value={subject} onChange={(e) => setSubject(e.target.value)} style={{ appearance: 'none', WebkitAppearance: 'none', width: '100%', height: 54, border: '1.5px solid #ECECEC', background: '#FAFAFA', borderRadius: 14, padding: '0 16px 0 44px', fontSize: 15, color: '#141414', cursor: 'pointer' }}>
          {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Icon name="chevron-down" size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#999', pointerEvents: 'none' }} />
      </div>
      <label htmlFor="cf-msg" style={{ ...label, marginTop: 16 }}>پیام <span style={{ color: '#FF5B0F' }}>*</span></label>
      <textarea id="cf-msg" data-field="" rows={5} value={msg} onChange={(e) => setMsg(e.target.value)} maxLength={800} placeholder="پیام خود را بنویسید…" style={{ ...fieldBase, border: `1.5px solid ${tried && !okMsg ? '#E0371F' : '#ECECEC'}`, padding: '14px 16px', resize: 'vertical', lineHeight: 1.9 }} />
      {bad && <div style={{ marginTop: 10, fontSize: 13, color: '#E0371F', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="alert-circle" size={16} />شماره موبایل معتبر و متن پیام را وارد کنید.</div>}
      {serverErr && <div style={{ marginTop: 10, fontSize: 13, color: '#E0371F', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="alert-circle" size={16} />{serverErr}</div>}
      <button data-btn="" type="button" onClick={submit} disabled={busy} style={{ marginTop: 22, width: '100%', height: 58, border: 'none', borderRadius: 14, background: '#FF5B0F', color: '#fff', fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 14px 30px rgba(255,91,15,.35)', opacity: busy ? 0.7 : 1 }}>
        {busy ? <><Icon name="loader-2" size={20} className="hm-spin" />در حال ارسال…</> : <>ارسال پیام<Icon name="send" size={19} style={{ transform: 'scaleX(-1)' }} /></>}
      </button>
    </>
  );
}

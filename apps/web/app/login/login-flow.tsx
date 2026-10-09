'use client';

// Port of design/project/login.dc.html, wired to the real OTP API.
import { digitsOnly, normalizeMobile, OTP_LENGTH, type Role, type SelfSignupRole, type SessionUser, toFaDigits } from '@hm/shared';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ClipboardEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/icon';
import { ROLE_UI } from '@/components/role-switch';
import { SiteHeader } from '@/components/site/site-header';
import { ApiError, api } from '@/lib/api';

const ROLES: { k: SelfSignupRole; icon: IconName; label: string; hint: string }[] = [
  { k: 'personal', icon: 'user', label: 'شخصی', hint: 'خرید برای منزل یا ساخت شخصی' },
  { k: 'contractor', icon: 'helmet', label: 'پیمانکار', hint: 'خرید عمده برای پروژه‌ها' },
  { k: 'driver', icon: 'truck', label: 'راننده', hint: 'صاحب خودرو برای حمل بار' },
  { k: 'supplier', icon: 'building-store', label: 'مصالح‌فروش', hint: 'فروش مصالح به پروژه‌های شهر' },
];

const ART: Record<SelfSignupRole, { tag: string; title: string; perks: [IconName, string][] }> = {
  personal: { tag: 'حساب شخصی', title: 'خرید مصالح ساده،\nتحویل درب منزل', perks: [['receipt-2', 'استعلام قیمت آنلاین'], ['truck-delivery', 'پیگیری لحظه‌ای بار و برگ حمل'], ['map-pin', 'ذخیره آدرس‌های تحویل'], ['headset', 'پشتیبانی و مشاوره رایگان']] },
  contractor: { tag: 'حساب پیمانکاری', title: 'مدیریت خرید همه\nپروژه‌ها در یک پنل', perks: [['building-skyscraper', 'تعریف چند پروژه و کارگاه'], ['file-invoice', 'پیش‌فاکتور، فاکتور و برگ‌های حمل'], ['discount', 'قیمت ویژه خرید عمده'], ['user-star', 'کارشناس اختصاصی']] },
  supplier: { tag: 'همکاری مصالح‌فروشان', title: 'استعلام‌های شهر خودت را\nبگیر و بیشتر بفروش', perks: [['message-question', 'دریافت استعلام از پروژه‌های شهر'], ['truck', 'حمل با رانندگان تاییدشده های مصالح'], ['lock-dollar', 'پرداخت امانی و تسویه یک‌روزه'], ['percentage', 'فقط از فروش موفق حق‌العمل']] },
  driver: { tag: 'همکاری رانندگان', title: 'ماشین داری؟\nدر شهر خودت بار بزن', perks: [['map-2', 'دریافت بار از مصالح‌فروشی‌های شهر خودت'], ['file-invoice', 'برگ حمل و نکات بار در پنل راننده'], ['cash', 'تسویه سریع کرایه'], ['shield-check', 'احراز هویت و مدارک امن']] },
};

const NEXT: Record<Role, { label: string; icon: IconName; text: string }> = {
  personal: { label: 'ورود به پنل کاربری', icon: 'layout-dashboard', text: 'اکنون می‌توانید سفارش‌ها، استعلام‌ها و برگ‌های حملی خود را از پنل پیگیری کنید.' },
  contractor: { label: 'ورود به پنل کاربری', icon: 'layout-dashboard', text: 'اکنون می‌توانید سفارش‌ها، استعلام‌ها و برگ‌های حملی خود را از پنل پیگیری کنید.' },
  supplier: { label: 'ورود به پنل مصالح‌فروش', icon: 'building-store', text: 'استعلام‌های قیمت پروژه‌های شهر شما، بارگیری‌ها و تسویه حساب در پنل مصالح‌فروش است.' },
  driver: { label: 'ورود به پنل راننده', icon: 'steering-wheel', text: 'بارهای پیشنهادی شهر شما و برگ‌های حملی فعال در پنل راننده آماده است.' },
  staff: { label: 'ورود به پنل مدیریت', icon: 'shield-lock', text: 'داشبورد مدیریت آماده است.' },
};

const field = { width: '100%', height: 54, border: '1.5px solid #ECECEC', background: '#FAFAFA', borderRadius: 14, padding: '0 48px 0 16px', fontSize: 15, color: '#141414' } as const;
const fieldIcon = { position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#999' } as const;
const label = { display: 'block', fontSize: 14, fontWeight: 700, color: '#222' } as const;
const cta = { width: '100%', height: 58, border: 'none', borderRadius: 14, background: '#FF5B0F', color: '#fff', fontSize: 17, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 14px 30px rgba(255,91,15,.35)' } as const;
const errLine = { marginTop: 8, fontSize: 13, color: '#E0371F', display: 'flex', alignItems: 'center', gap: 6 } as const;

const mmss = (sec: number) => toFaDigits(`${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`);

export function LoginFlow() {
  const params = useSearchParams();
  const qc = useQueryClient();
  const staff = params.get('staff') === '1';
  const ref = params.get('ref') ?? '';
  const [mode, setMode] = useState<'login' | 'register'>(() => (params.get('mode') === 'register' || params.get('role') === 'driver' ? 'register' : 'login'));
  const [role, setRole] = useState<SelfSignupRole>(() => ROLES.find((r) => r.k === params.get('role'))?.k ?? 'personal');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [err, setErr] = useState(false);
  const [otpErr, setOtpErr] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);
  const [blocked, setBlocked] = useState(false);
  // Set when sign-in found no account: the code already sent stays valid for sign-up.
  const [pendingCode, setPendingCode] = useState('');
  const [user, setUser] = useState<SessionUser | null>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const isReg = mode === 'register' && !staff;
  const okPhone = normalizeMobile(phone) !== null;

  useEffect(() => {
    if (left <= 0) { setBlocked(false); return; }
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  // Android Chrome reads the code from the SMS (needs the «@domain #code» last line in the template).
  useEffect(() => {
    if (step !== 2 || !('OTPCredential' in window)) return;
    const ac = new AbortController();
    navigator.credentials.get({ otp: { transport: ['sms'] }, signal: ac.signal } as CredentialRequestOptions)
      .then((c) => { const otp = (c as unknown as { code?: string } | null)?.code; if (otp) setCode(otp.slice(0, OTP_LENGTH).split('')); })
      .catch(() => {});
    return () => ac.abort();
  }, [step]);

  const handleError = (e: unknown, onSignupRequired?: () => void) => {
    if (e instanceof ApiError) {
      if (e.code === 'SIGNUP_REQUIRED' && onSignupRequired) return onSignupRequired();
      const retry = e.extra['retryAfterSec'];
      if (e.code === 'OTP_RATE_LIMIT' && typeof retry === 'number') { setLeft(retry); setBlocked(retry > 60); }
      setOtpErr(e.message);
    } else setOtpErr('ارتباط برقرار نشد. اینترنت را بررسی کنید.');
  };

  const signupPayload = () => (isReg ? { role, fullName: name, ...(company.trim() ? { orgName: company } : {}), ...(ref ? { referralCode: ref } : {}) } : undefined);

  const finish = async (otp: string) => {
    const u = await api<SessionUser>('/auth/otp/verify', {
      method: 'POST',
      json: { phone, code: otp, preferredRole: staff ? 'staff' : role, signup: signupPayload() },
    });
    qc.setQueryData(['me'], u);
    setUser(u);
    setStep(3);
  };

  const sendCode = async () => {
    if (busy) return;
    if (!okPhone) return setErr(true);
    setBusy(true); setOtpErr(''); setNotice('');
    try {
      if (pendingCode) await finish(pendingCode);
      else {
        const r = await api<{ resendAfterSec: number }>('/auth/otp/request', { method: 'POST', json: { phone } });
        setCode(Array(OTP_LENGTH).fill(''));
        setLeft(r.resendAfterSec); setBlocked(false);
        setStep(2);
        setTimeout(() => refs.current[0]?.focus(), 80);
      }
    } catch (e) {
      handleError(e);
      if (pendingCode) setPendingCode('');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setOtpErr('');
    try {
      const r = await api<{ resendAfterSec: number }>('/auth/otp/request', { method: 'POST', json: { phone } });
      setLeft(r.resendAfterSec); setBlocked(false);
    } catch (e) { handleError(e); }
  };

  const verify = async () => {
    if (busy) return;
    const otp = code.join('');
    if (otp.length < OTP_LENGTH) return setOtpErr('کد ۵ رقمی را کامل وارد کنید');
    setBusy(true); setOtpErr('');
    try {
      await finish(otp);
    } catch (e) {
      handleError(e, () => {
        setPendingCode(otp);
        setMode('register');
        setStep(1);
        setNotice('با این شماره هنوز حسابی ساخته نشده است. نوع حساب و نام خود را وارد کنید تا حساب ساخته شود.');
      });
    } finally {
      setBusy(false);
    }
  };

  const setDigit = (i: number, raw: string) => {
    const d = digitsOnly(raw, OTP_LENGTH);
    const next = code.slice();
    if (d.length > 1) {
      d.split('').forEach((c, k) => { if (i + k < OTP_LENGTH) next[i + k] = c; });
      setCode(next); setOtpErr('');
      refs.current[Math.min(OTP_LENGTH - 1, i + d.length)]?.focus();
      return;
    }
    next[i] = d; setCode(next); setOtpErr('');
    if (d && i < OTP_LENGTH - 1) refs.current[i + 1]?.focus();
  };
  const onOtpKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'Enter') void verify();
  };
  const onPaste = (i: number, e: ClipboardEvent<HTMLInputElement>) => { e.preventDefault(); setDigit(i, e.clipboardData.getData('text')); };

  const art = ART[role];
  const activeRole = user?.activeRole ?? role;
  const goDriverDocs = isReg && activeRole === 'driver';
  const next = goDriverDocs
    ? { label: 'ادامه: بارگذاری مدارک', icon: 'id' as IconName, text: 'برای فعال شدن حساب راننده، مدارک هویتی، مدارک خودرو، ویدیو و محل سکونت خود را بارگذاری کنید.', href: '/driver/register' }
    : { ...NEXT[activeRole], href: ROLE_UI[activeRole].home };

  return (
    <div dir="rtl" style={{ background: '#121212', minHeight: '100vh', minWidth: 0, overflowX: 'clip', position: 'relative' }}>
      <SiteHeader />
      <div style={{ position: 'absolute', inset: 0, background: "url('/hero.jpg') left center/cover no-repeat", opacity: 0.22, WebkitMaskImage: 'linear-gradient(to left,transparent,#000 70%)', maskImage: 'linear-gradient(to left,transparent,#000 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: '-10%', top: '-10%', width: '50%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,91,15,.16),transparent 62%)', pointerEvents: 'none' }} />

      <section data-wrap="" data-auth="" style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', padding: '140px 40px 80px', minHeight: '100vh', display: 'grid', gridTemplateColumns: 'minmax(0,500px) minmax(0,1fr)', gap: 70, alignItems: 'center' }}>
        <div data-reveal="right" style={{ background: '#fff', borderRadius: 28, padding: 'clamp(22px,4vw,38px)', boxShadow: '0 40px 100px rgba(0,0,0,.45)' }}>
          {step === 1 && (
            <>
              {!staff && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, background: '#F3F3F3', borderRadius: 14, padding: 5 }}>
                  <button data-tab="" data-active={isReg ? '0' : '1'} onClick={() => { setMode('login'); setPendingCode(''); setNotice(''); }} style={{ border: 'none', background: 'transparent', borderRadius: 10, height: 46, fontSize: 15, fontWeight: 800, color: '#777', cursor: 'pointer' }}>ورود</button>
                  <button data-tab="" data-active={isReg ? '1' : '0'} onClick={() => setMode('register')} style={{ border: 'none', background: 'transparent', borderRadius: 10, height: 46, fontSize: 15, fontWeight: 800, color: '#777', cursor: 'pointer' }}>ثبت‌نام</button>
                </div>
              )}
              {ref && isReg && (
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, background: '#F2FBF5', border: '1px dashed #BFE6CD', borderRadius: 14, padding: '12px 14px', fontSize: 14, color: '#1F5B36', lineHeight: 1.8 }}>
                  <Icon name="gift" size={22} style={{ color: '#22A45D' }} /><span>با کد معرف <b dir="ltr">{ref}</b> ثبت‌نام می‌کنید.</span>
                </div>
              )}
              {notice && (
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 10, background: '#FFF6F1', border: '1px dashed #F1C3AC', borderRadius: 14, padding: '12px 14px', fontSize: 13, lineHeight: 1.9, color: '#5A3A2A' }}>
                  <Icon name="info-circle" size={18} style={{ color: '#FF5B0F', marginTop: 2 }} /><span>{notice}</span>
                </div>
              )}
              <h1 style={{ margin: '24px 0 0', fontSize: 25, fontWeight: 900, color: '#141414' }}>{staff ? 'ورود مدیریت' : isReg ? 'ساخت حساب کاربری' : 'ورود به حساب کاربری'}</h1>
              <p style={{ margin: '6px 0 0', fontSize: 14, color: '#777', lineHeight: 1.9 }}>
                {staff ? 'شماره موبایلی را که مدیر برای شما ثبت کرده وارد کنید.' : isReg ? 'نوع حساب را انتخاب کنید تا امکانات متناسب با شما فعال شود.' : 'نوع حساب و شماره موبایل خود را وارد کنید.'}
              </p>

              {!staff && (
                <>
                  <label style={{ ...label, marginTop: 20 }}>{isReg ? 'ثبت‌نام به عنوان' : 'ورود به عنوان'}</label>
                  <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>
                    {ROLES.map((r) => (
                      <button key={r.k} data-role="" data-active={r.k === role ? '1' : '0'} onClick={() => setRole(r.k)} type="button" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 8px 14px', border: '1.5px solid #ECECEC', background: '#fff', borderRadius: 16, cursor: 'pointer', textAlign: 'center' }}>
                        <span data-role-check="" style={{ position: 'absolute', top: 8, left: 8, width: 20, height: 20, borderRadius: '50%', background: '#FF5B0F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transform: 'scale(.4)', transition: 'all .35s cubic-bezier(.2,.8,.2,1)' }}><Icon name="check" size={13} /></span>
                        <span data-role-ic="" style={{ width: 46, height: 46, borderRadius: 14, background: '#FFF0E8', color: '#FF5B0F', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .35s' }}><Icon name={r.icon} size={24} /></span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#141414' }}>{r.label}</span>
                        <span style={{ fontSize: 11, color: '#888', lineHeight: 1.7 }}>{r.hint}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {isReg && (
                <>
                  <label style={{ ...label, marginTop: 18 }}>نام و نام خانوادگی</label>
                  <div style={{ position: 'relative', marginTop: 8 }}>
                    <Icon name="user" size={20} style={fieldIcon} />
                    <input data-field="" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً علی محمدی" autoComplete="name" style={field} />
                  </div>
                </>
              )}
              {isReg && (role === 'contractor' || role === 'supplier') && (
                <>
                  <label style={{ ...label, marginTop: 16 }}>{role === 'supplier' ? 'نام فروشگاه مصالح' : 'نام شرکت یا گروه پیمانکاری'}</label>
                  <div style={{ position: 'relative', marginTop: 8 }}>
                    <Icon name="building" size={20} style={fieldIcon} />
                    <input data-field="" type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder={role === 'supplier' ? 'مثلاً مصالح فروشی البرز' : 'مثلاً شرکت ساختمانی آرمان'} autoComplete="organization" style={field} />
                  </div>
                </>
              )}
              {isReg && role === 'driver' && (
                <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'flex-start', background: '#FFF6F1', border: '1px dashed #F1C3AC', borderRadius: 14, padding: '12px 14px', fontSize: 13, lineHeight: 1.9, color: '#5A3A2A' }}>
                  <Icon name="info-circle" size={18} style={{ color: '#FF5B0F', marginTop: 2 }} /><span>پس از تایید شماره، مدارک هویتی و خودرو، ویدیو احراز هویت و محل سکونت را بارگذاری می‌کنید.</span>
                </div>
              )}
              {isReg && role === 'supplier' && (
                <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'flex-start', background: '#F2FBF5', border: '1px dashed #BFE6CD', borderRadius: 14, padding: '12px 14px', fontSize: 13, lineHeight: 1.9, color: '#1F5B36' }}>
                  <Icon name="discount-check" size={18} style={{ color: '#1F9D55', marginTop: 2 }} /><span>ثبت‌نام و دریافت استعلام رایگان است؛ فقط از فروش‌های موفقی که از طریق های مصالح تحویل می‌شوند حق‌العمل کسر می‌شود.</span>
                </div>
              )}

              <label style={{ ...label, marginTop: 18 }}>شماره موبایل</label>
              <div style={{ position: 'relative', marginTop: 8 }}>
                <Icon name="device-mobile" size={20} style={fieldIcon} />
                <input data-field="" type="tel" inputMode="numeric" dir="ltr" autoComplete="tel" value={phone} disabled={!!pendingCode}
                  onChange={(e) => setPhone(digitsOnly(e.target.value, 11))} onKeyDown={(e) => { if (e.key === 'Enter') void sendCode(); }} placeholder="0912 345 6789"
                  style={{ ...field, height: 56, border: `1.5px solid ${err && !okPhone ? '#E0371F' : '#ECECEC'}`, fontSize: 17, fontWeight: 600, letterSpacing: 1, textAlign: 'left' }} />
              </div>
              {err && !okPhone && <div style={errLine}><Icon name="alert-circle" size={16} />شماره موبایل معتبر وارد کنید</div>}
              {otpErr && <div style={errLine}><Icon name="alert-circle" size={16} />{otpErr}</div>}
              <button data-btn="" onClick={sendCode} style={{ ...cta, marginTop: 22 }}>
                {busy && <Icon name="loader-2" size={20} className="hm-spin" />}
                <span>{pendingCode ? 'ساخت حساب' : 'دریافت کد تایید'}</span><span data-chev="" style={{ display: 'flex' }}><Icon name="chevron-left" size={18} /></span>
              </button>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', fontSize: 12, color: '#999' }}>
                <span>ورود یعنی پذیرش <a href="#" style={{ color: '#FF5B0F', fontWeight: 700 }}>قوانین</a> های مصالح</span>
                {staff
                  ? <Link href="/login" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#666', fontWeight: 700 }}><Icon name="user" size={15} />ورود کاربران</Link>
                  : <Link href="/login?staff=1" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#666', fontWeight: 700 }}><Icon name="shield-lock" size={15} />ورود مدیریت</Link>}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <button onClick={() => { setStep(1); setOtpErr(''); }} style={{ border: 'none', background: '#F3F3F3', borderRadius: 12, height: 42, padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: '#333', cursor: 'pointer' }}>
                <Icon name="arrow-right" size={17} />ویرایش شماره
              </button>
              <h1 style={{ margin: '24px 0 0', fontSize: 26, fontWeight: 900, color: '#141414' }}>کد تایید را وارد کنید</h1>
              <p style={{ margin: '8px 0 0', fontSize: 15, color: '#777', lineHeight: 1.9 }}>
                کد ۵ رقمی به شماره <span dir="ltr" style={{ fontWeight: 800, color: '#141414', whiteSpace: 'nowrap' }}>{toFaDigits(phone.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3'))}</span> ارسال شد.
              </p>
              <div dir="ltr" style={{ marginTop: 26, display: 'grid', gridTemplateColumns: `repeat(${OTP_LENGTH},minmax(0,1fr))`, gap: 10 }}>
                {code.map((v, i) => (
                  <input key={i} ref={(el) => { refs.current[i] = el; }} data-otp="" type="tel" inputMode="numeric" maxLength={OTP_LENGTH}
                    autoComplete={i === 0 ? 'one-time-code' : 'off'} aria-label={`رقم ${toFaDigits(i + 1)} کد`} value={v}
                    onChange={(e) => setDigit(i, e.target.value)} onKeyDown={(e) => onOtpKey(i, e)} onPaste={(e) => onPaste(i, e)}
                    style={{ width: '100%', aspectRatio: '1', maxHeight: 68, border: `1.5px solid ${otpErr ? '#E0371F' : '#ECECEC'}`, background: '#FAFAFA', borderRadius: 14, textAlign: 'center', fontSize: 26, fontWeight: 900, color: '#141414', transition: 'all .3s' }} />
                ))}
              </div>
              {otpErr && !blocked && <div style={{ ...errLine, marginTop: 10 }}><Icon name="alert-circle" size={16} />{otpErr}</div>}
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, color: '#777' }}>
                {blocked && left > 0 && <span style={{ color: '#C8341E', fontWeight: 700 }}>تعداد درخواست زیاد شد. {mmss(left)} دیگر دوباره امتحان کنید.</span>}
                {!blocked && left > 0 && <><Icon name="clock" size={16} />ارسال مجدد تا {mmss(left)} دیگر</>}
                {left === 0 && (
                  <button onClick={resend} style={{ border: 'none', background: 'none', color: '#FF5B0F', fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Icon name="refresh" size={16} />ارسال مجدد کد
                  </button>
                )}
              </div>
              <button data-btn="" onClick={verify} style={{ ...cta, marginTop: 22 }}>
                {busy && <Icon name="loader-2" size={20} className="hm-spin" />}<span>تایید و ادامه</span>
              </button>
            </>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px 0 6px' }}>
              <div style={{ width: 96, height: 96, borderRadius: '50%', background: '#FF5B0F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 12px #FFF0E8,0 20px 40px rgba(255,91,15,.35)', animation: 'hmpop .7s cubic-bezier(.2,.8,.2,1) both' }}>
                <Icon name="check" size={50} />
              </div>
              <div style={{ marginTop: 30, fontSize: 24, fontWeight: 900, color: '#141414' }}>{isReg ? `${user?.fullName ? `${user.fullName}، ` : ''}خوش آمدید!` : 'با موفقیت وارد شدید'}</div>
              <p style={{ margin: '10px 0 0', fontSize: 15, color: '#666', lineHeight: 2, maxWidth: 360 }}>{next.text}</p>
              <Link data-btn="" href={next.href} style={{ ...cta, marginTop: 26 }}><Icon name={next.icon} size={20} />{next.label}</Link>
            </div>
          )}
        </div>

        <div data-auth-art="" data-reveal="left" style={{ color: '#fff' }}>
          <div style={{ display: 'inline-flex', color: '#FF5B0F', fontSize: 14, fontWeight: 700, background: 'rgba(255,91,15,.12)', padding: '7px 16px', borderRadius: 999 }}>{art.tag}</div>
          <h2 style={{ margin: '20px 0 0', fontSize: 'clamp(30px,3.4vw,46px)', fontWeight: 900, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{art.title}</h2>
          <div style={{ marginTop: 34, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {art.perks.map(([i, t]) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 16, color: '#DDD' }}>
                <span style={{ width: 44, height: 44, flex: 'none', borderRadius: 13, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF5B0F' }}><Icon name={i} size={22} /></span>
                {t}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

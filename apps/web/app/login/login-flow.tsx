'use client';

// Functional but intentionally plain: the final look comes from the updated login design.
import { digitsOnly, normalizeMobile, OTP_LENGTH, ROLE_LABELS, type SelfSignupRole, SELF_SIGNUP_ROLES, type SessionUser, toFaDigits } from '@hm/shared';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { ApiError, api } from '@/lib/api';

type Step = 'phone' | 'code' | 'signup';

export function LoginFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [role, setRole] = useState<SelfSignupRole>(() => {
    const r = params.get('role');
    return (SELF_SIGNUP_ROLES as readonly string[]).includes(r ?? '') ? (r as SelfSignupRole) : 'personal';
  });
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  // Android Chrome: read the code from the SMS automatically (needs the «@domain #code» last line).
  useEffect(() => {
    if (step !== 'code' || !('OTPCredential' in window)) return;
    const ac = new AbortController();
    navigator.credentials
      .get({ otp: { transport: ['sms'] }, signal: ac.signal } as CredentialRequestOptions)
      .then((c) => {
        const otp = (c as unknown as { code?: string } | null)?.code;
        if (otp) setCode(otp);
      })
      .catch(() => {});
    return () => ac.abort();
  }, [step]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.code === 'SIGNUP_REQUIRED') return setStep('signup');
        if (typeof e.extra['retryAfterSec'] === 'number') setWait(e.extra['retryAfterSec']);
        setError(e.message);
      } else setError('ارتباط برقرار نشد. اینترنت را بررسی کنید.');
    } finally {
      setBusy(false);
    }
  }

  const requestCode = (e?: FormEvent) => {
    e?.preventDefault();
    if (!normalizeMobile(phone)) return setError('شماره موبایل معتبر نیست');
    void run(async () => {
      const r = await api<{ resendAfterSec: number }>('/auth/otp/request', { method: 'POST', json: { phone } });
      setWait(r.resendAfterSec);
      setStep('code');
    });
  };

  const verify = (e: FormEvent) => {
    e.preventDefault();
    const signup = step === 'signup' ? { role, fullName, ...(orgName ? { orgName } : {}), ...(params.get('ref') ? { referralCode: params.get('ref')! } : {}) } : undefined;
    void run(async () => {
      await api<SessionUser>('/auth/otp/verify', { method: 'POST', json: { phone, code, signup } });
      router.replace('/account');
    });
  };

  const needsOrg = role === 'contractor' || role === 'supplier';
  const field = 'h-14 w-full rounded-xl border-[1.5px] border-[#ececec] bg-white px-4 text-lg outline-none focus:border-orange';

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-white p-6">
      <h1 className="text-2xl font-black text-ink">{step === 'signup' ? 'ساخت حساب کاربری' : 'ورود یا ثبت‌نام'}</h1>

      {step === 'phone' && (
        <form onSubmit={requestCode} className="mt-6 flex flex-col gap-4">
          <label className="text-sm font-bold text-[#333]">شماره موبایل</label>
          <input className={field} dir="ltr" inputMode="numeric" autoComplete="tel" placeholder="0912 345 6789"
            value={phone} onChange={(e) => setPhone(digitsOnly(e.target.value, 11))} />
          <button disabled={busy} className="h-14 rounded-xl bg-orange font-extrabold text-white disabled:opacity-60">دریافت کد تایید</button>
        </form>
      )}

      {step !== 'phone' && (
        <form onSubmit={verify} className="mt-6 flex flex-col gap-4">
          <p className="text-sm text-muted">کد ۵ رقمی به {toFaDigits(phone)} پیامک شد.</p>
          <input className={`${field} text-center tracking-[0.5em]`} dir="ltr" inputMode="numeric" autoComplete="one-time-code"
            maxLength={OTP_LENGTH} value={code} onChange={(e) => setCode(digitsOnly(e.target.value, OTP_LENGTH))} />

          {step === 'signup' && (
            <>
              <p className="text-sm font-bold text-[#333]">ثبت‌نام به عنوان</p>
              <div className="grid grid-cols-2 gap-2">
                {SELF_SIGNUP_ROLES.map((r) => (
                  <button type="button" key={r} onClick={() => setRole(r)}
                    className={`h-12 rounded-xl border-[1.5px] font-bold ${role === r ? 'border-orange bg-orange-50 text-orange-600' : 'border-[#ececec]'}`}>
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
              <input className={field} placeholder="نام و نام خانوادگی" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              {needsOrg && (
                <input className={field} placeholder={role === 'supplier' ? 'نام فروشگاه مصالح' : 'نام شرکت یا گروه پیمانکاری'}
                  value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              )}
            </>
          )}

          <button disabled={busy || code.length < OTP_LENGTH} className="h-14 rounded-xl bg-orange font-extrabold text-white disabled:opacity-60">
            {step === 'signup' ? 'ساخت حساب' : 'ورود'}
          </button>
          <button type="button" disabled={wait > 0 || busy} onClick={() => requestCode()} className="text-sm font-bold text-orange disabled:text-muted">
            {wait > 0 ? `ارسال دوباره تا ${toFaDigits(wait)} ثانیه دیگر` : 'ارسال دوبارهٔ کد'}
          </button>
        </form>
      )}

      {error && <p className="mt-4 rounded-xl bg-[#fdecea] p-3 text-sm font-bold text-danger">{error}</p>}
    </div>
  );
}

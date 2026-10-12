'use client';

// Test servers only: shows the SMS "sent" to a test number (SMS_TEST_PREFIX), so a tester can sign in without a real phone.
// The API answers 404 for anything else, and on a server where the dev tools are off.
import { toFaDigits } from '@hm/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError, api } from '@/lib/api';

interface Msg { at: string; to: string; kind: string; text: string; code?: string }

export function DevOtp() {
  const [phone, setPhone] = useState('');
  const ok = /^09\d{9}$/.test(phone);
  const q = useQuery({
    queryKey: ['dev-otp', phone],
    queryFn: () => api<{ prefix: string; messages: Msg[] }>(`/dev/test-sms?phone=${phone}`),
    enabled: ok, refetchInterval: 3000, retry: false,
  });
  const off = q.error instanceof ApiError && q.error.status === 404;
  const last = q.data?.messages.find((m) => m.kind === 'otp');

  return (
    <main dir="rtl" style={{ minHeight: '100dvh', background: '#F4F4F5', padding: '24px 16px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>کد ورود شماره‌های آزمایشی</h1>
        <p style={{ margin: '8px 0 0', fontSize: 14, color: '#666', lineHeight: 1.9 }}>شمارهٔ آزمایشی را بنویسید، در صفحهٔ ورود کد را بخواهید و همین‌جا ببینید. برای شماره‌های واقعی کار نمی‌کند.</p>
        <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))} inputMode="numeric" dir="ltr" placeholder="09000000001" aria-label="شمارهٔ آزمایشی"
          style={{ marginTop: 14, width: '100%', height: 56, border: '1.5px solid #E2E2E2', borderRadius: 14, padding: '0 16px', fontSize: 18, fontWeight: 700, textAlign: 'left', background: '#fff' }} />
        {ok && off && <div style={{ marginTop: 14, background: '#FDECEA', borderRadius: 12, padding: 14, fontSize: 14, color: '#8A2A1E', lineHeight: 1.9 }}>این شماره آزمایشی نیست، یا ابزار آزمایشی در این سرور خاموش است.</div>}
        {ok && !off && last?.code && (
          <div style={{ marginTop: 14, background: '#141414', color: '#fff', borderRadius: 18, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#BBB' }}>آخرین کد ورود — {new Date(last.at).toLocaleTimeString('fa-IR')}</div>
            <div dir="ltr" style={{ marginTop: 6, fontSize: 44, fontWeight: 900, letterSpacing: 8, color: '#3DDC84' }}>{toFaDigits(last.code)}</div>
          </div>
        )}
        {ok && !off && q.data && !last?.code && <div style={{ marginTop: 14, fontSize: 14, color: '#888' }}>هنوز کدی نیامده. در صفحهٔ ورود «ارسال کد» را بزنید.</div>}
        {ok && !off && q.data && q.data.messages.length > 0 && (
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>پیام‌های اخیر این شماره</div>
            {q.data.messages.map((m, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #EEE', borderRadius: 10, padding: '8px 12px', fontSize: 13, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
                <b>{m.kind}</b> · {new Date(m.at).toLocaleTimeString('fa-IR')}<br />{m.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

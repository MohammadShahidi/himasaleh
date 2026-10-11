'use client';

// The page a different vehicle owner opens from the link the driver forwards: read the text aloud on video and send it.
import { useEffect, useState } from 'react';
import { Icon } from '@/components/icon';
import { ApiError, api } from '@/lib/api';

interface Info { ownerName: string; driverName: string; plate: string; script: string; alreadySent: boolean }

export function OwnerVideo({ token }: { token: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [bad, setBad] = useState('');
  const [file, setFile] = useState<{ name: string; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [raw, setRaw] = useState<File | null>(null);

  useEffect(() => {
    api<Info>(`/owner-video/${encodeURIComponent(token)}`).then((r) => { setInfo(r); setDone(r.alreadySent); }).catch((e) => setBad(e instanceof ApiError ? e.message : 'ارتباط برقرار نشد. اینترنت را بررسی کنید.'));
  }, [token]);

  const pick = (f: File | undefined) => { if (!f) return; setRaw(f); setFile({ name: f.name, url: URL.createObjectURL(f) }); setErr(''); };
  const send = async () => {
    if (!raw || busy) return;
    setBusy(true); setErr('');
    try {
      const body = new FormData();
      body.append('file', raw);
      await api(`/owner-video/${encodeURIComponent(token)}/video`, { method: 'POST', body });
      setDone(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'ارسال نشد. اینترنت را بررسی کنید و دوباره امتحان کنید.');
    } finally { setBusy(false); }
  };

  const shell = (children: React.ReactNode) => (
    <main dir="rtl" style={{ minHeight: '100dvh', background: '#F4F4F5', padding: 'calc(20px + env(safe-area-inset-top)) 16px 32px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', fontSize: 22, fontWeight: 900, color: '#141414' }}><span style={{ color: '#FF5B0F' }}>های</span> مصالح</div>
        <div style={{ marginTop: 18, background: '#fff', borderRadius: 24, padding: 22, boxShadow: '0 14px 40px rgba(0,0,0,.06)' }}>{children}</div>
      </div>
    </main>
  );

  if (bad) return shell(<div style={{ textAlign: 'center', padding: '24px 0' }}><Icon name="alert-circle" size={44} style={{ color: '#E0371F' }} /><p style={{ marginTop: 12, fontSize: 16, fontWeight: 800 }}>{bad}</p><p style={{ fontSize: 14, color: '#777', lineHeight: 1.9 }}>از راننده بخواهید لینک تازه بفرستد.</p></div>);
  if (!info) return shell(<div style={{ textAlign: 'center', color: '#888', padding: 24 }}>در حال بارگذاری…</div>);
  if (done) return shell(<div style={{ textAlign: 'center', padding: '16px 0' }}><span style={{ width: 84, height: 84, margin: '0 auto', borderRadius: '50%', background: '#E6F6EC', color: '#22A45D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="circle-check" size={48} /></span><h1 style={{ margin: '18px 0 0', fontSize: 22, fontWeight: 900 }}>ویدیوی شما دریافت شد</h1><p style={{ fontSize: 15, color: '#666', lineHeight: 2 }}>از همکاری شما سپاسگزاریم. نتیجه از طریق راننده اطلاع داده می‌شود.</p></div>);

  return shell(
    <>
      <h1 style={{ margin: 0, fontSize: 21, fontWeight: 900 }}>ویدیو رضایت مالک خودرو</h1>
      <p style={{ margin: '8px 0 0', fontSize: 14, color: '#666', lineHeight: 2 }}>
        {info.ownerName} عزیز، {info.driverName} شما را به‌عنوان مالک خودرو (پلاک {info.plate}) معرفی کرده است. لطفاً چهره و کارت ملی خود را نشان دهید و متن زیر را در ویدیو بخوانید.
      </p>
      <div style={{ marginTop: 14, background: '#FFF8F4', border: '1px dashed #F1C3AC', borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="quote" size={18} style={{ color: '#FF5B0F' }} />متنی که می‌خوانید</div>
        <div style={{ marginTop: 8, fontSize: 15, lineHeight: 2.1, color: '#333' }}>{info.script}</div>
      </div>
      {file && <video src={file.url} controls playsInline style={{ marginTop: 14, width: '100%', maxHeight: 320, borderRadius: 16, background: '#000' }} />}
      <label data-btn="" style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#FF5B0F', color: '#fff', fontSize: 16, fontWeight: 800, height: 56, borderRadius: 14, cursor: 'pointer' }}>
        <input type="file" accept="video/*" capture="user" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
        <Icon name="video" size={20} />{file ? 'ضبط دوباره' : 'ضبط ویدیو با دوربین'}
      </label>
      <label data-btn="" data-hv="invert-dark" style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1.5px solid #141414', color: '#141414', fontSize: 15, fontWeight: 700, height: 52, borderRadius: 14, cursor: 'pointer' }}>
        <input type="file" accept="video/*" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
        <Icon name="upload" size={19} />انتخاب از گالری
      </label>
      {err && <div style={{ marginTop: 12, fontSize: 14, color: '#C8341E', fontWeight: 700 }}>{err}</div>}
      <button onClick={send} disabled={!file || busy} style={{ marginTop: 16, width: '100%', height: 58, border: 'none', borderRadius: 14, background: file ? '#141414' : '#CFCFCF', color: '#fff', fontSize: 17, fontWeight: 900, cursor: file ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {busy && <Icon name="loader-2" size={20} className="hm-spin" />}ارسال ویدیو
      </button>
    </>,
  );
}

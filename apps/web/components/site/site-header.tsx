'use client';

// Port of design/project/SiteHeader.dc.html: glass header, mega menu, mobile drawer, scroll
// progress, back-to-top, PWA install button, and the page-wide scroll-reveal behaviour.
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icon';
import { CATEGORIES, categoryHref, openConsult, SITE, type SiteSection, telHref } from '@/lib/site';

const NAV: { key: SiteSection; label: string; href: string }[] = [
  { key: 'home', label: 'خانه', href: '/' },
  { key: 'products', label: 'محصولات', href: '/products' },
  { key: 'categories', label: 'دسته‌بندی‌ها', href: '/categories' },
  { key: '', label: 'پروژه‌ها', href: '/about#timeline' },
  { key: 'about', label: 'درباره ما', href: '/about' },
  { key: 'contact', label: 'تماس با ما', href: '/contact' },
];

const navLink = { color: '#fff', padding: '8px 0' } as const;
const drawerRow = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 4px', fontSize: 17, fontWeight: 600,
  color: '#fff', borderBottom: '1px solid rgba(255,255,255,.07)',
} as const;

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };

function useReveal() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.documentElement.classList.add('rv');
    const seen = new WeakSet<Element>();
    const vh = () => window.innerHeight || 800;
    const io = !reduce && 'IntersectionObserver' in window
      ? new IntersectionObserver((ents) => ents.forEach((en) => {
          if (!en.isIntersecting) return;
          const el = en.target as HTMLElement, d = +(el.dataset['delay'] || 0) * 90;
          el.style.transitionDelay = `${d}ms`;
          el.classList.add('is-in');
          setTimeout(() => { el.style.transitionDelay = ''; }, 1000 + d);
          io?.unobserve(el);
        }), { threshold: 0.1, rootMargin: '0px 0px -30px 0px' })
      : null;
    const reveal = (el: HTMLElement) => {
      if (seen.has(el) || el.classList.contains('is-in')) return;
      seen.add(el);
      if (!io || document.visibilityState === 'hidden') return el.classList.add('is-in');
      const r = el.getBoundingClientRect();
      if (r.top < vh() && r.bottom > 0) {
        const d = +(el.dataset['delay'] || 0) * 90;
        el.style.transitionDelay = `${d}ms`;
        setTimeout(() => el.classList.add('is-in'), 20);
        setTimeout(() => { el.style.transitionDelay = ''; }, 1100 + d);
        return;
      }
      io.observe(el);
    };
    const scan = () => document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)').forEach(reveal);
    // Fail-safe: never leave content hidden (background tabs, late-mounted parts).
    const sweep = () => {
      const hidden = document.visibilityState === 'hidden';
      document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)').forEach((el) => {
        if (hidden || el.getBoundingClientRect().top < vh()) el.classList.add('is-in');
      });
    };
    scan();
    let n = 0;
    const failsafe = setInterval(() => { sweep(); if (++n > 8) clearInterval(failsafe); }, 1500);
    const onVis = () => { scan(); sweep(); };
    document.addEventListener('visibilitychange', onVis);
    let scanT: ReturnType<typeof setTimeout>;
    const mo = new MutationObserver(() => { clearTimeout(scanT); scanT = setTimeout(scan, 30); });
    mo.observe(document.body, { childList: true, subtree: true });
    let swT: ReturnType<typeof setTimeout>;
    const onScroll = () => { clearTimeout(swT); swT = setTimeout(sweep, 250); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      io?.disconnect(); mo.disconnect(); clearInterval(failsafe); clearTimeout(scanT); clearTimeout(swT);
      document.removeEventListener('visibilitychange', onVis); window.removeEventListener('scroll', onScroll);
    };
  }, []);
}

export function SiteHeader({ active = '' }: { active?: SiteSection }) {
  const [menu, setMenu] = useState(false);
  const [prod, setProd] = useState(false);
  const [install, setInstall] = useState<BeforeInstallPromptEvent | null>(null);
  const progRef = useRef<HTMLDivElement>(null);
  const hdrRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLElement>(null);
  const topRef = useRef<HTMLAnchorElement>(null);

  useReveal();

  useEffect(() => {
    let raf = 0;
    const apply = () => {
      raf = 0;
      const y = window.scrollY || 0, max = document.documentElement.scrollHeight - window.innerHeight;
      if (progRef.current) progRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      const h = hdrRef.current;
      if (h) {
        const on = y > 30;
        h.style.backgroundColor = on ? 'rgba(16,16,16,.76)' : 'transparent';
        h.style.backdropFilter = on ? 'blur(18px) saturate(140%)' : 'none';
        h.style.setProperty('-webkit-backdrop-filter', on ? 'blur(18px) saturate(140%)' : 'none');
        h.style.boxShadow = on ? '0 10px 40px rgba(0,0,0,.28)' : 'none';
        if (innerRef.current) innerRef.current.style.paddingBlock = on ? '12px' : '26px';
      }
      const t = topRef.current;
      if (t) {
        const s = y > 600;
        t.style.opacity = s ? '1' : '0';
        t.style.pointerEvents = s ? 'auto' : 'none';
        t.style.transform = s ? 'none' : 'translateY(16px)';
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    const onBIP = (e: Event) => { e.preventDefault(); setInstall(e as BeforeInstallPromptEvent); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('keydown', onKey);
    apply();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll);
      window.removeEventListener('beforeinstallprompt', onBIP); window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menu ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menu]);

  const consult = () => { setMenu(false); openConsult(); };
  const doInstall = async () => {
    if (!install) return;
    await install.prompt();
    try { await install.userChoice; } catch { /* dismissed */ }
    setInstall(null);
  };

  return (
    <div dir="rtl">
      <div ref={progRef} style={{ position: 'fixed', top: 0, right: 0, left: 0, height: 3, zIndex: 80, background: 'linear-gradient(to left,#FF5B0F,#FF9A3D)', transform: 'scaleX(0)', transformOrigin: 'right' }} />

      <div ref={hdrRef} style={{ position: 'fixed', top: 0, right: 0, left: 0, zIndex: 60, paddingTop: 'env(safe-area-inset-top)', transition: 'background-color .45s,box-shadow .45s' }}>
        <header ref={innerRef} data-wrap="" style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '26px clamp(20px,3vw,40px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'clamp(12px,2vw,24px)', transition: 'padding .45s cubic-bezier(.2,.8,.2,1)' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff' }}>
            <img src="/logo-light.png" alt="" style={{ height: 48, width: 'auto', display: 'block' }} />
            <span style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}><span style={{ color: '#FF5B0F' }}>{SITE.brandAccent}</span> {SITE.brandRest}</span>
          </Link>

          <nav data-nav="" style={{ display: 'flex', alignItems: 'center', gap: 'clamp(14px,2.4vw,34px)', fontSize: 'clamp(13px,1.1vw,15px)', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {NAV.map((n) =>
              n.key === 'products' ? (
                <div key="products" data-mega-wrap="" style={{ display: 'flex' }}>
                  <Link data-nl="" data-active={active === 'products' ? '1' : '0'} href={n.href} style={{ ...navLink, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {n.label}<span data-mega-chev="" style={{ display: 'flex' }}><Icon name="chevron-down" size={14} /></span>
                  </Link>
                  <div data-mega="" style={{ position: 'absolute', top: '100%', right: 'clamp(20px,3vw,40px)', left: 'clamp(20px,3vw,40px)', paddingTop: 6, zIndex: 5 }}>
                    <div style={{ background: '#fff', borderRadius: 22, boxShadow: '0 30px 80px rgba(0,0,0,.28)', padding: 30, display: 'grid', gridTemplateColumns: 'repeat(5,minmax(0,1fr)) minmax(0,1.3fr)', gap: 26, whiteSpace: 'normal' }}>
                      {CATEGORIES.map((c) => (
                        <div key={c.key} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                          <Link data-mega-cat="" href={categoryHref(c.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#141414', fontSize: 15, fontWeight: 800 }}>
                            <span style={{ width: 38, height: 38, flex: 'none', borderRadius: 11, background: '#FFF0E8', color: '#FF5B0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={c.icon} size={20} /></span>
                            {c.name}
                          </Link>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, paddingRight: 4 }}>
                            {c.subs.map((s) => (
                              <Link key={s} data-sublink="" href={categoryHref(c.key, s)} style={{ color: '#666', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#FFB48F', flex: 'none' }} />{s}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, background: '#161616', color: '#fff', padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 220 }}>
                        <div style={{ position: 'absolute', inset: 0, background: "url('/warehouse.jpg') center/cover", opacity: 0.35 }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,#161616 30%,rgba(22,22,22,.2))' }} />
                        <div style={{ position: 'relative', fontSize: 17, fontWeight: 800, lineHeight: 1.7 }}>برای انتخاب مصالح مناسب مشاوره رایگان بگیرید</div>
                        <button data-btn="" onClick={consult} style={{ position: 'relative', marginTop: 14, border: 'none', background: '#FF5B0F', color: '#fff', fontSize: 14, fontWeight: 700, padding: '12px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          درخواست مشاوره<span data-chev="" style={{ display: 'flex' }}><Icon name="chevron-left" size={16} /></span>
                        </button>
                        <Link href="/products" style={{ position: 'relative', marginTop: 12, fontSize: 13, fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
                          مشاهده همه محصولات<Icon name="arrow-left" size={15} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Link key={n.label} data-nl="" data-active={n.key && active === n.key ? '1' : '0'} href={n.href} style={navLink}>{n.label}</Link>
              ),
            )}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(12px,1.8vw,26px)', whiteSpace: 'nowrap' }}>
            <a data-hide-narrow="" href={telHref(SITE.phone)} dir="ltr" style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontSize: 15, fontWeight: 600 }}>
              <Icon name="headset" size={22} /><span style={{ whiteSpace: 'nowrap' }}>{SITE.phone}</span>
            </a>
            <Link data-btn="" data-login="" href="/login" style={{ display: 'flex', alignItems: 'center', gap: 8, height: 46, padding: '0 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,.18)', background: 'rgba(255,255,255,.06)', backdropFilter: 'blur(10px)', color: '#fff', fontSize: 15, fontWeight: 700 }}>
              <Icon name="user-circle" size={21} /><span data-login-txt="">ورود / ثبت‌نام</span>
            </Link>
            <Link data-btn="" data-hdr-cta="" href="/contact" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FF5B0F', color: '#fff', fontSize: 15, fontWeight: 700, padding: '13px 24px', borderRadius: 10 }}>
              <Icon name="phone" size={18} />تماس با ما
            </Link>
            <button data-burger="" onClick={() => setMenu(true)} aria-label="منو" style={{ display: 'none', width: 46, height: 46, borderRadius: 12, border: '1px solid rgba(255,255,255,.14)', background: 'rgba(255,255,255,.06)', color: '#fff', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon name="menu-2" size={22} />
            </button>
          </div>
        </header>
      </div>

      <div style={{ position: 'fixed', inset: 0, zIndex: 90, pointerEvents: menu ? 'auto' : 'none' }} aria-hidden={!menu}>
        <div onClick={() => setMenu(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', backdropFilter: 'blur(4px)', opacity: menu ? 1 : 0, transition: 'opacity .45s' }} />
        <aside style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 'min(340px,88vw)', background: '#151515', color: '#fff', padding: 'calc(24px + env(safe-area-inset-top)) 24px calc(26px + env(safe-area-inset-bottom))', display: 'flex', flexDirection: 'column', overflowY: 'auto', transform: menu ? 'translateX(0)' : 'translateX(105%)', transition: 'transform .55s cubic-bezier(.2,.8,.2,1)', boxShadow: '-20px 0 60px rgba(0,0,0,.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <span style={{ fontSize: 22, fontWeight: 900, whiteSpace: 'nowrap' }}><span style={{ color: '#FF5B0F' }}>{SITE.brandAccent}</span> {SITE.brandRest}</span>
            <button onClick={() => setMenu(false)} aria-label="بستن" style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid rgba(255,255,255,.14)', background: 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Icon name="x" size={20} />
            </button>
          </div>
          <Link href="/" style={drawerRow}>خانه<Icon name="chevron-left" size={16} style={{ color: '#FF5B0F' }} /></Link>
          <button onClick={() => setProd((p) => !p)} style={{ ...drawerRow, background: 'none', border: 'none', borderBottom: drawerRow.borderBottom, cursor: 'pointer', textAlign: 'right' }}>
            محصولات<Icon name="chevron-down" size={16} style={{ color: '#FF5B0F', transition: 'transform .4s', transform: prod ? 'rotate(180deg)' : 'none' }} />
          </button>
          <div style={{ display: 'grid', gridTemplateRows: prod ? '1fr' : '0fr', transition: 'grid-template-rows .5s cubic-bezier(.2,.8,.2,1)' }}>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 0' }}>
                {CATEGORIES.map((c) => (
                  <Link key={c.key} data-drawer-cat="" href={categoryHref(c.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', borderRadius: 10, fontSize: 15, color: '#ddd' }}>
                    <Icon name={c.icon} size={19} style={{ color: '#FF5B0F' }} />{c.name}
                  </Link>
                ))}
                <Link href="/products" style={{ padding: '10px 8px', fontSize: 14, fontWeight: 700, color: '#FF5B0F', display: 'flex', alignItems: 'center', gap: 6 }}>همه محصولات<Icon name="arrow-left" size={15} /></Link>
              </div>
            </div>
          </div>
          <Link href="/categories" style={drawerRow}>دسته‌بندی‌ها<Icon name="chevron-left" size={16} style={{ color: '#FF5B0F' }} /></Link>
          <Link href="/login?mode=register&role=driver" style={drawerRow}>همکاری رانندگان<Icon name="truck" size={18} style={{ color: '#FF5B0F' }} /></Link>
          <Link href="/login?mode=register&role=supplier" style={drawerRow}>همکاری مصالح‌فروشان<Icon name="building-store" size={18} style={{ color: '#FF5B0F' }} /></Link>
          <Link href="/about" style={drawerRow}>درباره ما<Icon name="chevron-left" size={16} style={{ color: '#FF5B0F' }} /></Link>
          <Link href="/contact" style={drawerRow}>تماس با ما<Icon name="chevron-left" size={16} style={{ color: '#FF5B0F' }} /></Link>
          <div style={{ marginTop: 'auto', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link data-btn="" data-drawer-login="" href="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1.5px solid rgba(255,255,255,.25)', color: '#fff', fontSize: 16, fontWeight: 700, padding: 15, borderRadius: 12 }}>
              <Icon name="user-circle" size={20} />ورود / ثبت‌نام
            </Link>
            <a href={telHref(SITE.phone)} dir="ltr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#fff', fontSize: 16, fontWeight: 600 }}>
              <Icon name="headset" size={20} style={{ color: '#FF5B0F' }} />{SITE.phone}
            </a>
            <button data-btn="" onClick={consult} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#FF5B0F', color: '#fff', border: 'none', fontSize: 16, fontWeight: 700, padding: 16, borderRadius: 12 }}>
              <Icon name="message-2" size={18} />درخواست مشاوره
            </button>
          </div>
        </aside>
      </div>

      <a ref={topRef} data-totop="" href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label="بازگشت به بالا"
        style={{ position: 'fixed', left: 24, bottom: 'calc(24px + env(safe-area-inset-bottom))', zIndex: 70, width: 48, height: 48, borderRadius: '50%', background: 'rgba(20,20,20,.82)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', opacity: 0, pointerEvents: 'none', transform: 'translateY(16px)', transition: 'opacity .45s,transform .45s cubic-bezier(.2,.8,.2,1),background-color .3s', boxShadow: '0 10px 30px rgba(0,0,0,.25)' }}>
        <Icon name="chevron-up" size={22} />
      </a>

      {install && (
        <button onClick={doInstall} data-btn="" style={{ position: 'fixed', right: 24, bottom: 'calc(24px + env(safe-area-inset-bottom))', zIndex: 70, display: 'flex', alignItems: 'center', gap: 8, background: '#FF5B0F', color: '#fff', border: 'none', fontSize: 15, fontWeight: 700, padding: '14px 22px', borderRadius: 999, boxShadow: '0 14px 34px rgba(255,91,15,.45)' }}>
          <Icon name="download" size={18} />نصب اپلیکیشن
        </button>
      )}
    </div>
  );
}

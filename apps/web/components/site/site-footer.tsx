// Port of design/project/SiteFooter.dc.html.
import Link from 'next/link';
import { Icon } from '@/components/icon';
import { CATEGORIES, categoryHref, SITE, telHref } from '@/lib/site';

const QUICK = [
  { label: 'خانه', href: '/' },
  { label: 'محصولات', href: '/products' },
  { label: 'دسته‌بندی‌ها', href: '/categories' },
  { label: 'همکاری رانندگان', href: '/login?mode=register&role=driver' },
  { label: 'همکاری مصالح‌فروشان', href: '/login?mode=register&role=supplier' },
  { label: 'درباره ما', href: '/about' },
  { label: 'تماس با ما', href: '/contact' },
];

const heading = { fontSize: 17, fontWeight: 800, color: '#141414' } as const;
const list = { marginTop: 22, display: 'flex', flexDirection: 'column', gap: 18, fontSize: 15 } as const;
const contactRow = { display: 'flex', alignItems: 'center', gap: 12, color: '#444' } as const;

export function SiteFooter() {
  return (
    <footer dir="rtl" style={{ position: 'relative', marginTop: 66, background: '#F7F7F7', borderTop: '1px solid #ECECEC' }}>
      <div data-wrap="" data-foot-grid="" style={{ maxWidth: 1280, margin: '0 auto', padding: '70px 40px 40px', display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) repeat(3,minmax(0,1fr))', gap: 'clamp(24px,3vw,40px)' }}>
        <div data-reveal="" data-foot-brand="" style={{ borderLeft: '1px solid #E2E2E2', paddingLeft: 30 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo-dark.png" alt="" style={{ height: 48, width: 'auto', display: 'block' }} />
            <span style={{ fontSize: 26, fontWeight: 900, color: '#141414', whiteSpace: 'nowrap' }}><span style={{ color: '#FF5B0F' }}>{SITE.brandAccent}</span> {SITE.brandRest}</span>
          </Link>
          <p style={{ margin: '24px 0 0', fontSize: 15, lineHeight: 2.1, color: '#555', maxWidth: 280, textWrap: 'pretty' }}>{SITE.footerAbout}</p>
          <div style={{ display: 'flex', gap: 14, marginTop: 26 }}>
            {SITE.socials.map((s) => (
              <a key={s.icon} data-foot-social="" href={s.href} style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #CFCFCF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2A2A2A' }}>
                <Icon name={s.icon} size={19} />
              </a>
            ))}
          </div>
        </div>
        <div data-reveal="" data-delay="1">
          <div style={heading}>دسترسی سریع</div>
          <div style={list}>{QUICK.map((q) => <Link key={q.href} data-foot-link="" href={q.href} style={{ color: '#444' }}>{q.label}</Link>)}</div>
        </div>
        <div data-reveal="" data-delay="2">
          <div style={heading}>دسته‌بندی محصولات</div>
          <div style={list}>{CATEGORIES.map((c) => <Link key={c.key} data-foot-link="" href={categoryHref(c.key)} style={{ color: '#444' }}>{c.name}</Link>)}</div>
        </div>
        <div data-reveal="" data-delay="3">
          <div style={heading}>اطلاعات تماس</div>
          <div style={{ ...list, color: '#444' }}>
            <a href={telHref(SITE.phone)} style={contactRow}><Icon name="phone" size={20} style={{ color: '#FF5B0F' }} /><span dir="ltr" style={{ whiteSpace: 'nowrap' }}>{SITE.phone}</span></a>
            <a href={telHref(SITE.mobile)} style={contactRow}><Icon name="device-mobile" size={20} style={{ color: '#FF5B0F' }} /><span dir="ltr" style={{ whiteSpace: 'nowrap' }}>{SITE.mobile}</span></a>
            <a href={`mailto:${SITE.email}`} style={contactRow}><Icon name="mail" size={20} style={{ color: '#FF5B0F' }} /><span dir="ltr" style={{ whiteSpace: 'nowrap' }}>{SITE.email}</span></a>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, lineHeight: 1.9 }}><Icon name="map-pin" size={20} style={{ color: '#FF5B0F', marginTop: 3 }} /><span>{SITE.address}</span></div>
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: 14, color: '#555', padding: '26px 40px calc(34px + env(safe-area-inset-bottom))' }}>{SITE.copyright}</div>
    </footer>
  );
}

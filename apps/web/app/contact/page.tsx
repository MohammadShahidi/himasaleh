import { toFaDigits } from '@hm/shared';
import type { Metadata } from 'next';
import { Icon, type IconName } from '@/components/icon';
import { ConsultTrigger } from '@/components/site/consult-trigger';
import { PageHero } from '@/components/site/page-hero';
import { PublicPage } from '@/components/site/public-page';
import { ShopMap } from '@/components/site/shop-map';
import { Spot } from '@/components/site/spot';
import { SITE, telHref } from '@/lib/site';
import { ContactForm } from './contact-form';

export const metadata: Metadata = {
  title: 'تماس با ما',
  description: 'تماس با های مصالح: تلفن، نشانی و فرم پیام برای استعلام قیمت، مشاوره و ثبت سفارش.',
};

const { lat, lon } = SITE.geo;
const mapLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;

export default function ContactPage() {
  const cards: { icon: IconName; label: string; value: string; href: string; ltr?: boolean }[] = [
    { icon: 'phone', label: 'تلفن ثابت', value: toFaDigits(SITE.phone), href: telHref(SITE.phone), ltr: true },
    ...(SITE.mobile ? [{ icon: 'device-mobile' as const, label: 'موبایل و واتساپ', value: toFaDigits(SITE.mobile), href: telHref(SITE.mobile), ltr: true }] : []),
    { icon: 'mail', label: 'ایمیل', value: SITE.email, href: `mailto:${SITE.email}`, ltr: true },
    { icon: 'map-pin', label: 'آدرس', value: SITE.address, href: mapLink },
  ];

  return (
    <PublicPage active="contact">
      <PageHero title="تماس با ما" crumb="تماس با ما" img="/ctabg.jpg" subtitle="برای استعلام قیمت، مشاوره یا ثبت سفارش از هر راهی که راحت‌ترید با ما در ارتباط باشید." />

      <section data-wrap="" style={{ position: 'relative', zIndex: 3, maxWidth: 1280, margin: '-70px auto 0', padding: '0 40px' }}>
        <div data-ccards="" style={{ display: 'grid', gridTemplateColumns: `repeat(${cards.length},minmax(0,1fr))`, gap: 20 }}>
          {cards.map((c, i) => (
            <div key={c.label} data-reveal="" data-delay={i}>
              <a data-ccard="" data-lift="" href={c.href} {...(c.icon === 'map-pin' ? { target: '_blank', rel: 'noopener' } : {})} style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14, background: '#fff', border: '1px solid #F0F0F0', borderRadius: 22, padding: 26, boxShadow: '0 18px 44px rgba(0,0,0,.08)', color: '#141414' }}>
                <span data-feat-ic="" style={{ width: 56, height: 56, borderRadius: 16, background: '#FFF0E8', color: '#FF5B0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={c.icon} size={28} /></span>
                <span style={{ fontSize: 14, color: '#888', fontWeight: 600 }}>{c.label}</span>
                <span {...(c.ltr ? { dir: 'ltr' as const } : {})} style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.8, ...(c.ltr ? { alignSelf: 'flex-start' } : {}) }}>{c.value}</span>
              </a>
            </div>
          ))}
        </div>
      </section>

      <section data-wrap="" data-contact="" style={{ maxWidth: 1280, margin: '0 auto', padding: '70px 40px 90px', display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,1fr)', gap: 28, alignItems: 'stretch' }}>
        <div data-reveal="right" style={{ background: '#fff', border: '1px solid #F0F0F0', borderRadius: 24, padding: 'clamp(24px,3.5vw,40px)', boxShadow: '0 14px 40px rgba(0,0,0,.06)' }}>
          <ContactForm />
        </div>

        <div data-reveal="left" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div id="map" style={{ position: 'relative', flex: 1, minHeight: 300, borderRadius: 24, overflow: 'hidden', background: '#EEE', boxShadow: '0 14px 40px rgba(0,0,0,.08)' }}>
            <ShopMap lat={lat} lon={lon} />
            <a data-btn="" data-hv-glow="" href={mapLink} target="_blank" rel="noopener" style={{ position: 'absolute', right: 16, bottom: 16, background: '#141414', color: '#fff', fontSize: 14, fontWeight: 700, padding: '12px 18px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="map-pin" size={18} />مسیریابی</a>
          </div>
          <Spot style={{ borderRadius: 24, background: 'radial-gradient(420px circle at var(--mx,50%) var(--my,30%),rgba(255,91,15,.2),transparent 55%),#161616', color: '#fff', padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 800 }}><Icon name="clock-hour-4" size={24} style={{ color: '#FF5B0F' }} />ساعات کاری</div>
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {SITE.hours.map((h) => (
                <div key={h.d} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 15, paddingBottom: 12, borderBottom: '1px solid #2A2A2A' }}><span style={{ color: '#BBB' }}>{h.d}</span><span style={{ fontWeight: 700 }}>{h.t}</span></div>
              ))}
            </div>
            <ConsultTrigger hover="glow" style={{ marginTop: 20, width: '100%', border: 'none', background: '#FF5B0F', color: '#fff', fontSize: 15, fontWeight: 800, padding: 15, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Icon name="message-2" size={18} />درخواست مشاوره فوری</ConsultTrigger>
          </Spot>
        </div>
      </section>
    </PublicPage>
  );
}

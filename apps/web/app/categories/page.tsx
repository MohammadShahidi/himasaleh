import { toFaDigits } from '@hm/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/icon';
import { ConsultTrigger } from '@/components/site/consult-trigger';
import { PageHero } from '@/components/site/page-hero';
import { PublicPage } from '@/components/site/public-page';
import { Spot } from '@/components/site/spot';
import { CATEGORIES, categoryHref } from '@/lib/site';

export const metadata: Metadata = {
  title: 'دسته‌بندی محصولات',
  description: 'پنج گروه اصلی مصالح ساختمانی، از سفت‌کاری تا تاسیسات: سیمان، آهن‌آلات، آجر و بلوک، شن و ماسه، لوله و اتصالات.',
};

const STEPS: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'category', title: 'انتخاب دسته', desc: 'دسته و زیرگروه مصالح مورد نیاز را انتخاب کنید.' },
  { icon: 'receipt-2', title: 'استعلام قیمت', desc: 'قیمت روز را آنلاین یا تلفنی دریافت کنید.' },
  { icon: 'clipboard-check', title: 'ثبت سفارش', desc: 'مقدار و محل تحویل را هماهنگ کنید.' },
  { icon: 'truck-delivery', title: 'تحویل در محل', desc: 'بار شما در کوتاه‌ترین زمان به کارگاه می‌رسد.' },
];

const badge = { display: 'inline-flex', color: '#FF5B0F', fontSize: 14, fontWeight: 700, background: '#FFF0E8', padding: '7px 16px', borderRadius: 999 } as const;

export default function CategoriesPage() {
  return (
    <PublicPage active="categories">
      <PageHero title="دسته‌بندی محصولات" crumb="دسته‌بندی‌ها" img="/c3.jpg" subtitle="پنج گروه اصلی مصالح ساختمانی، از سفت‌کاری تا تاسیسات؛ دسته مورد نظر را انتخاب کنید و مستقیم به زیرگروه‌ها بروید." />

      <section data-wrap="" style={{ maxWidth: 1280, margin: '0 auto', padding: '70px 40px 0' }}>
        <div data-bento="" style={{ display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: 22 }}>
          {CATEGORIES.map((c, i) => (
            <div key={c.key} data-reveal="" data-delay={i}>
              <div data-card="" data-bcard="" style={{ position: 'relative', height: '100%', minHeight: 380, borderRadius: 24, overflow: 'hidden', background: '#1a1a1a', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', boxShadow: '0 16px 40px rgba(0,0,0,.12)' }}>
                <div data-zoom="" style={{ position: 'absolute', inset: 0, backgroundImage: `url('${c.img}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(14,14,14,.96) 18%,rgba(14,14,14,.55) 55%,rgba(14,14,14,.1))' }} />
                <Link href={categoryHref(c.key)} aria-label={c.name} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />
                <div style={{ position: 'absolute', top: 22, right: 22, left: 22, zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pointerEvents: 'none' }}>
                  <span style={{ width: 54, height: 54, borderRadius: 16, background: 'rgba(255,255,255,.14)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF7A3A' }}><Icon name={c.icon} size={28} /></span>
                  <span data-arrow="" style={{ width: 48, height: 48, borderRadius: '50%', border: '1px solid rgba(255,255,255,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Icon name="arrow-left" size={20} /></span>
                </div>
                <div style={{ position: 'relative', zIndex: 2, padding: 26, pointerEvents: 'none' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#FF7A3A' }}>{toFaDigits(c.subs.length)} زیرگروه</div>
                  <h2 style={{ margin: '8px 0 0', fontSize: 'clamp(22px,2.2vw,28px)', fontWeight: 900 }}>{c.name}</h2>
                  <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.9, color: '#D0D0D0', maxWidth: 420 }}>{c.desc}</p>
                  <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8, pointerEvents: 'auto' }}>
                    {c.subs.map((s) => (
                      <Link key={s} data-subchip="" href={categoryHref(c.key, s)} style={{ position: 'relative', zIndex: 3, fontSize: 13, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.18)', padding: '7px 13px', borderRadius: 999 }}>{s}</Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section data-wrap="" style={{ maxWidth: 1280, margin: '0 auto', padding: '96px 40px 0', textAlign: 'center' }}>
        <div data-reveal="" style={badge}>مراحل سفارش</div>
        <h2 data-reveal="" data-delay="1" style={{ margin: '18px 0 0', fontSize: 'clamp(26px,3vw,36px)', fontWeight: 900, color: '#141414' }}>از انتخاب تا تحویل در کارگاه</h2>
        <div data-steps="" style={{ marginTop: 50, display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 22, textAlign: 'right' }}>
          {STEPS.map((st, i) => (
            <div key={st.title} data-reveal="" data-delay={i}>
              <div data-step="" data-lift="" style={{ height: '100%', background: '#FAFAFA', border: '1px solid #F0F0F0', borderRadius: 20, padding: 26 }}>
                <div data-step-n="" style={{ width: 52, height: 52, borderRadius: 15, background: '#FFF0E8', color: '#FF5B0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={st.icon} size={26} /></div>
                <div style={{ marginTop: 18, fontSize: 13, fontWeight: 800, color: '#FF5B0F' }}>مرحله {toFaDigits(i + 1)}</div>
                <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800, color: '#141414' }}>{st.title}</div>
                <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.9, color: '#777' }}>{st.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section data-wrap="" style={{ maxWidth: 1280, margin: '0 auto', padding: '70px 40px 90px' }}>
        <Spot data-reveal="" style={{ position: 'relative', overflow: 'hidden', borderRadius: 22, background: 'radial-gradient(520px circle at var(--mx,20%) var(--my,50%),rgba(255,91,15,.18),transparent 45%),#181818', padding: '40px clamp(24px,5vw,64px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', border: '1px solid #262626' }}>
          <div>
            <div style={{ fontSize: 'clamp(20px,2.2vw,28px)', fontWeight: 900, color: '#fff' }}>مطمئن نیستید کدام دسته مناسب پروژه شماست؟</div>
            <div style={{ marginTop: 10, fontSize: 15, color: '#BBB' }}>کارشناسان ما بر اساس نوع سازه، بهترین ترکیب مصالح را پیشنهاد می‌دهند.</div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <ConsultTrigger hover="glow" style={{ border: 'none', background: '#FF5B0F', color: '#fff', fontSize: 16, fontWeight: 800, padding: '17px 28px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}><Icon name="message-2" size={18} />درخواست مشاوره</ConsultTrigger>
            <Link data-btn="" data-hv="invert-light" href="/products" style={{ border: '1.5px solid #fff', color: '#fff', fontSize: 16, fontWeight: 700, padding: '16px 26px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}>همه محصولات<Icon name="chevron-left" size={17} /></Link>
          </div>
        </Spot>
      </section>
    </PublicPage>
  );
}

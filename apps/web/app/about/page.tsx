import { toFaDigits } from '@hm/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/icon';
import { ConsultTrigger } from '@/components/site/consult-trigger';
import { Counter } from '@/components/site/counter';
import { PageHero } from '@/components/site/page-hero';
import { PublicPage } from '@/components/site/public-page';
import { Spot } from '@/components/site/spot';
import { Timeline } from '@/components/site/timeline';
import { PRODUCTS } from '@/lib/catalog';
import { CATEGORIES, SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'درباره ما',
  description: 'های مصالح در سال ۱۴۰۵ با هدف شکستن قیمت‌ها و رساندن مصالح با کیفیت و قیمت مناسب به مشتریان آغاز به کار کرد.',
};

const VALUES: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'shield-check', title: 'کیفیت اصل', desc: 'فقط کالای استاندارد و دارای ضمانت اصالت عرضه می‌کنیم.' },
  { icon: 'scale', title: 'صداقت در قیمت', desc: 'قیمت روز شفاف و بدون هزینه پنهان یا واسطه.' },
  { icon: 'clock-bolt', title: 'سرعت در تحویل', desc: 'حمل سریع و هماهنگ تا درِ کارگاه.' },
  { icon: 'heart-handshake', title: 'همراهی تا پایان', desc: 'مشاوره فنی از انتخاب تا اتمام پروژه.' },
];

// Milestones exactly as in the design file (design/project/about.dc.html). The owner asked for them as designed;
// they predate ۱۴۰۵, so check them against the real history (DECISIONS §9). Phase 4: from the CMS.
const TIMELINE = [
  { y: '۱۳۹۰', title: 'تاسیس', desc: 'آغاز فعالیت با اولین فروشگاه در بازار آهن تهران' },
  { y: '۱۳۹۴', title: 'همکاری مستقیم', desc: 'قرارداد تامین با تولیدکنندگان معتبر سیمان و فولاد' },
  { y: '۱۳۹۸', title: 'ناوگان اختصاصی', desc: 'راه‌اندازی ناوگان حمل برای تحویل سریع‌تر' },
  { y: '۱۴۰۲', title: 'پوشش سراسری', desc: 'ارسال مصالح به پروژه‌ها در سراسر کشور' },
  { y: '۱۴۰۵', title: 'فروشگاه آنلاین', desc: 'راه‌اندازی اپلیکیشن و استعلام آنلاین قیمت' },
];

const subCount = CATEGORIES.reduce((n, c) => n + c.subs.length, 0);
const badge = { display: 'inline-flex', color: '#FF5B0F', fontSize: 14, fontWeight: 700, background: '#FFF0E8', padding: '7px 16px', borderRadius: 999 } as const;

export default function AboutPage() {
  return (
    <PublicPage active="about">
      <PageHero title="درباره های مصالح" crumb="درباره ما" img="/warehouse.jpg" subtitle="از سال ۱۴۰۵ برای شکستن قیمت‌ها و رساندن مصالح با کیفیت و قیمت مناسب به مشتریان محترم." />

      <section data-wrap="" data-story="" style={{ maxWidth: 1280, margin: '0 auto', padding: '90px 40px 0', display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 80, alignItems: 'center' }}>
        <div>
          <div data-reveal="right" style={badge}>داستان ما</div>
          <h2 data-reveal="right" data-delay="1" style={{ margin: '16px 0 0', fontSize: 'clamp(28px,3vw,40px)', lineHeight: 1.6, fontWeight: 900, color: '#141414' }}>آغاز راهی برای شکستن قیمت‌ها</h2>
          <p data-reveal="right" data-delay="2" style={{ margin: '24px 0 0', fontSize: 16, lineHeight: 2.2, color: '#666', textWrap: 'pretty' }}>
            های مصالح فعالیت خود را از سال {toFaDigits(SITE.foundedYear)} با یک هدف روشن آغاز کرد: شکستن قیمت‌ها و رساندن مصالح ساختمانی با قیمت مناسب و کیفیت بالا به مشتریان محترم.
          </p>
          <p data-reveal="right" data-delay="3" style={{ margin: '16px 0 0', fontSize: 16, lineHeight: 2.2, color: '#666', textWrap: 'pretty' }}>
            تیم ما پیش از خرید در کنار شماست تا مصالح مناسب پروژه انتخاب شود و پس از تحویل هم پاسخگوی هر پرسشی هستیم.
          </p>
          <div data-reveal="right" data-delay="4" style={{ marginTop: 32, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <Link data-btn="" data-hv-glow="" href="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#FF5B0F', color: '#fff', fontSize: 16, fontWeight: 700, padding: '16px 28px', borderRadius: 12 }}>مشاهده محصولات<Icon name="chevron-left" size={17} /></Link>
            <ConsultTrigger hover="invert-dark" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#fff', border: '1.5px solid #141414', color: '#141414', fontSize: 16, fontWeight: 700, padding: '15px 26px', borderRadius: 12 }}><Icon name="message-2" size={18} />درخواست مشاوره</ConsultTrigger>
          </div>
        </div>
        <div data-reveal="left" style={{ position: 'relative' }}>
          <div data-card="" style={{ borderRadius: 24, overflow: 'hidden', aspectRatio: 1.15, background: '#222', boxShadow: '0 24px 60px rgba(0,0,0,.16)' }}>
            <div data-zoom="" style={{ width: '100%', height: '100%', background: "url('/hero.jpg') center/cover no-repeat" }} />
          </div>
          <div className="hm-float" style={{ position: 'absolute', right: -22, bottom: 34, background: '#fff', borderRadius: 20, padding: '20px 24px', boxShadow: '0 20px 50px rgba(0,0,0,.14)', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: '#FF5B0F', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="award" size={30} /></div>
            <div><div style={{ fontSize: 28, fontWeight: 900, color: '#141414', lineHeight: 1.2 }}>{toFaDigits(SITE.foundedYear)}</div><div style={{ fontSize: 14, color: '#777' }}>سال آغاز فعالیت</div></div>
          </div>
        </div>
      </section>

      <section data-wrap="" style={{ maxWidth: 1280, margin: '0 auto', padding: '90px 40px 0' }}>
        <Spot data-reveal="scale" data-stats-grid="" style={{ background: 'radial-gradient(520px circle at var(--mx,50%) var(--my,50%),rgba(255,91,15,.16),transparent 45%),#161616', borderRadius: 22, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', padding: '50px 0', border: '1px solid #242424' }}>
          {[
            { num: <Counter to={PRODUCTS.length} suffix="+" />, label: 'محصول متنوع' },
            { num: <Counter to={CATEGORIES.length} />, label: 'دستهٔ اصلی مصالح' },
            { num: <Counter to={subCount} />, label: 'زیرگروه تخصصی' },
          ].map((s) => (
            <div key={s.label} data-stat="" style={{ textAlign: 'center', borderLeft: '1px solid #3A3A3A', padding: '6px 20px' }}>
              <div style={{ fontSize: 'clamp(34px,3.6vw,50px)', fontWeight: 900, color: '#FF5B0F', lineHeight: 1.2 }}>{s.num}</div>
              <div style={{ marginTop: 14, fontSize: 'clamp(14px,1.2vw,17px)', fontWeight: 600, color: '#fff' }}>{s.label}</div>
            </div>
          ))}
        </Spot>
      </section>

      <section data-wrap="" style={{ maxWidth: 1280, margin: '0 auto', padding: '96px 40px 0', textAlign: 'center' }}>
        <div data-reveal="" style={badge}>ارزش‌های ما</div>
        <h2 data-reveal="" data-delay="1" style={{ margin: '18px 0 0', fontSize: 'clamp(26px,3vw,38px)', fontWeight: 900, color: '#141414' }}>اصولی که به آن پایبندیم</h2>
        <div data-values="" style={{ marginTop: 50, display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 22 }}>
          {VALUES.map((v, i) => (
            <div key={v.title} data-reveal="" data-delay={i}>
              <div data-feat="" data-lift="" style={{ height: '100%', background: '#fff', border: '1px solid #F0F0F0', borderRadius: 22, padding: '34px 24px', boxShadow: '0 10px 30px rgba(0,0,0,.05)' }}>
                <div data-feat-ic="" style={{ width: 70, height: 70, margin: '0 auto', borderRadius: '50%', background: '#FFF0E8', color: '#FF5B0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={v.icon} size={34} /></div>
                <div style={{ marginTop: 20, fontSize: 19, fontWeight: 800, color: '#141414' }}>{v.title}</div>
                <div style={{ marginTop: 10, fontSize: 14, lineHeight: 2, color: '#777' }}>{v.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="timeline" data-wrap="" style={{ maxWidth: 1280, margin: '0 auto', padding: '96px 40px 0', scrollMarginTop: 90 }}>
        <div style={{ textAlign: 'center' }}>
          <div data-reveal="" style={badge}>مسیر رشد</div>
          <h2 data-reveal="" data-delay="1" style={{ margin: '18px 0 0', fontSize: 'clamp(26px,3vw,38px)', fontWeight: 900, color: '#141414' }}>نقاط عطف های مصالح</h2>
        </div>
        <Timeline items={TIMELINE} />
      </section>

      <section data-wrap="" style={{ maxWidth: 1280, margin: '0 auto', padding: '90px 40px 90px' }}>
        <Spot data-reveal="" style={{ position: 'relative', overflow: 'hidden', borderRadius: 22, background: 'radial-gradient(520px circle at var(--mx,20%) var(--my,50%),rgba(255,91,15,.18),transparent 45%),#181818', padding: '44px clamp(24px,5vw,64px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', border: '1px solid #262626' }}>
          <div style={{ fontSize: 'clamp(20px,2.4vw,30px)', fontWeight: 900, color: '#fff', lineHeight: 1.7 }}>پروژه بعدی شما را<br />با هم می‌سازیم</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link data-btn="" data-hv-glow="" href="/contact" style={{ background: '#FF5B0F', color: '#fff', fontSize: 16, fontWeight: 800, padding: '17px 28px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}><Icon name="phone" size={18} />تماس با ما</Link>
            <ConsultTrigger hover="invert-light" style={{ border: '1.5px solid #fff', background: 'transparent', color: '#fff', fontSize: 16, fontWeight: 700, padding: '16px 26px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, whiteSpace: 'nowrap' }}><Icon name="message-2" size={18} />درخواست مشاوره</ConsultTrigger>
          </div>
        </Spot>
      </section>
    </PublicPage>
  );
}

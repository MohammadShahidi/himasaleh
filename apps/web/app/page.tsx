import { toFaDigits } from '@hm/shared';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/icon';
import { ConsultTrigger } from '@/components/site/consult-trigger';
import { Counter } from '@/components/site/counter';
import { HeroVisual } from '@/components/site/hero-visual';
import { PublicPage } from '@/components/site/public-page';
import { Spot } from '@/components/site/spot';
import { PRODUCTS } from '@/lib/catalog';
import { CATEGORIES, SITE, categoryHref } from '@/lib/site';

const FEATURES: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'award', title: 'کیفیت تضمینی', desc: 'ارائه بهترین کیفیت مصالح با ضمانت اصالت کالا' },
  { icon: 'truck-delivery', title: 'تحویل سریع', desc: 'ارسال سریع و مطمئن مصالح تا درِ کارگاه' },
  { icon: 'discount', title: 'قیمت منصفانه', desc: 'شکستن قیمت‌ها و بهترین نرخ بدون واسطه' },
  { icon: 'headset', title: 'پشتیبانی تخصصی', desc: 'مشاوره و پشتیبانی قبل و بعد از خرید' },
];

const PERKS = ['قیمت رقابتی و شفاف', 'کنترل کیفیت در تمام مراحل', 'مشاوره تخصصی رایگان', 'تنوع کامل محصولات'];

const DRIVER_STEPS: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'id', title: 'ثبت‌نام و مدارک', desc: 'کارت ملی، کارت ماشین، برگ سبز و ویدیو' },
  { icon: 'shield-check', title: 'تایید حساب', desc: 'بررسی مدارک توسط تیم های مصالح' },
  { icon: 'truck-delivery', title: 'دریافت بار', desc: 'بار شهر خودت با برگ حمل آنلاین' },
];

const subCount = CATEGORIES.reduce((n, c) => n + c.subs.length, 0);

const badge = { display: 'inline-flex', color: '#FF5B0F', fontSize: 14, fontWeight: 700, background: '#FFF0E8', padding: '7px 16px', borderRadius: 999 } as const;

export default function Home() {
  return (
    <PublicPage active="home">
      <section data-hero="" style={{ position: 'relative', background: '#121212', color: '#fff', borderBottomLeftRadius: '62% 150px', paddingBottom: 170, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-10%', top: '-20%', width: '60%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,91,15,.14),transparent 62%)', pointerEvents: 'none' }} />
        <div data-wrap="" data-hero-grid="" style={{ position: 'relative', zIndex: 2, maxWidth: 1280, margin: '0 auto', padding: '220px 40px 40px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
          <div style={{ gridColumn: 1, minWidth: 'min(560px,100%)' }}>
            <h1 style={{ margin: 0, fontWeight: 900, lineHeight: 1.35 }}>
              <span data-reveal="" data-delay="1" style={{ display: 'block', fontSize: 'clamp(34px,3.8vw,52px)' }}><span style={{ color: '#FF5B0F' }}>{SITE.brandAccent}</span> {SITE.brandRest}</span>
              <span data-reveal="" data-delay="2" data-hero-title2="" style={{ display: 'block', fontSize: 'clamp(30px,3.6vw,50px)', marginTop: 10, whiteSpace: 'nowrap' }}>کیفیتی که ماندگار می‌سازد</span>
            </h1>
            <p data-reveal="" data-delay="3" style={{ margin: '34px 0 0', fontSize: 'clamp(16px,1.5vw,21px)', lineHeight: 2, color: '#E6E6E6', fontWeight: 500, textWrap: 'pretty' }}>
              تامین و عرضه انواع مصالح ساختمانی با بهترین کیفیت و قیمت مناسب، با هدف شکستن قیمت‌ها و رساندن مصالح به دست مشتریان
            </p>
            <div data-reveal="" data-delay="4" data-hero-btns="" style={{ display: 'flex', alignItems: 'center', gap: 36, marginTop: 44, flexWrap: 'wrap' }}>
              <Link data-btn="" data-hv="glow" href="/products" style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#FF5B0F', color: '#fff', fontSize: 17, fontWeight: 700, padding: '18px 30px', borderRadius: 12, whiteSpace: 'nowrap', boxShadow: '0 0 34px rgba(255,91,15,0.55)' }}>
                مشاهده محصولات<Icon name="chevron-left" size={18} />
              </Link>
              <Link data-hv-link="" href="/about" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff', fontSize: 17, fontWeight: 600, whiteSpace: 'nowrap' }}>
                درباره ما بیشتر بدانید<Icon name="chevron-left" size={18} style={{ color: '#FF5B0F' }} />
              </Link>
            </div>
          </div>
        </div>
        <HeroVisual img="/hero.jpg" />
      </section>

      <section data-wrap="" style={{ position: 'relative', zIndex: 3, maxWidth: 1280, margin: '-150px auto 0', padding: '0 40px' }}>
        <div data-reveal="scale" data-feat-grid="" style={{ background: 'rgba(255,255,255,.94)', backdropFilter: 'blur(20px)', borderRadius: 22, boxShadow: '0 24px 60px rgba(0,0,0,0.10)', display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', padding: '44px 0' }}>
          {FEATURES.map((f) => (
            <div key={f.title} data-feat="" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '4px clamp(10px,1.6vw,30px)', borderLeft: '1px solid #EFEFEF' }}>
              <div data-feat-ic="" style={{ width: 74, height: 74, borderRadius: '50%', background: '#FFF0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF5B0F' }}><Icon name={f.icon} size={36} /></div>
              <div style={{ marginTop: 22, fontSize: 'clamp(15px,1.4vw,19px)', fontWeight: 800, color: '#141414', whiteSpace: 'nowrap' }}>{f.title}</div>
              <div data-feat-desc="" style={{ marginTop: 16, fontSize: 15, lineHeight: 2, color: '#707070', maxWidth: 220 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section data-wrap="" style={{ maxWidth: 1280, margin: '0 auto', padding: '96px 40px 0', textAlign: 'center' }}>
        <div data-reveal="" style={badge}>محصولات ما</div>
        <h2 data-reveal="" data-delay="1" style={{ margin: '18px 0 0', fontSize: 'clamp(28px,3vw,38px)', fontWeight: 900, color: '#141414' }}>مشاهده دسته‌بندی محصولات</h2>
        <p data-reveal="" data-delay="2" style={{ margin: '20px 0 0', fontSize: 'clamp(15px,1.3vw,18px)', color: '#6B6B6B' }}>انواع مصالح ساختمانی با کیفیت بالا و قیمت مناسب</p>
        {/* Slow endless drift to the right so every category shows without any action; pauses on hover/focus. */}
        <div data-reveal="" className="hm-marquee" style={{ marginTop: 52 }}>
          <div className="hm-marquee-track">
            {[0, 1, 2].flatMap((copy) =>
              CATEGORIES.map((c) => (
                <Link key={`${copy}-${c.key}`} data-card="" data-lift="" href={categoryHref(c.key)} {...(copy ? { 'aria-hidden': true, tabIndex: -1 } : {})} className="hm-marquee-card" style={{ display: 'block', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
                  <div style={{ aspectRatio: 1.25, overflow: 'hidden' }}><div data-zoom="" style={{ width: '100%', height: '100%', backgroundImage: `url('${c.img}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} /></div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '20px 6px', fontSize: 16, fontWeight: 700, color: '#141414', whiteSpace: 'nowrap' }}>
                    <Icon name={c.icon} size={24} style={{ color: '#FF5B0F' }} /><span>{c.name}</span>
                  </div>
                </Link>
              )),
            )}
          </div>
        </div>
        <div data-reveal="">
          <Link data-btn="" data-hv-fill="" href="/products" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 38, border: '1.5px solid #FF5B0F', color: '#FF5B0F', fontSize: 16, fontWeight: 700, padding: '17px 38px', borderRadius: 12 }}>
            مشاهده همه محصولات<Icon name="chevron-left" size={17} />
          </Link>
        </div>
      </section>

      <section data-wrap="" style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 40px 0' }}>
        <Spot data-reveal="scale" data-stats-grid="" style={{ background: 'radial-gradient(520px circle at var(--mx,50%) var(--my,50%),rgba(255,91,15,.16),transparent 45%),#161616', borderRadius: 22, display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', padding: '50px 0', border: '1px solid #242424' }}>
          {[
            { num: <Counter to={PRODUCTS.length} suffix="+" />, label: 'محصول متنوع' },
            { num: <Counter to={CATEGORIES.length} />, label: 'دستهٔ اصلی مصالح' },
            { num: <Counter to={subCount} />, label: 'زیرگروه تخصصی' },
            { num: toFaDigits(SITE.foundedYear), label: 'سال آغاز فعالیت' },
          ].map((s) => (
            <div key={s.label} data-stat="" style={{ textAlign: 'center', borderLeft: '1px solid #3A3A3A', padding: '6px 20px' }}>
              <div style={{ fontSize: 'clamp(34px,3.6vw,50px)', fontWeight: 900, color: '#FF5B0F', lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>{s.num}</div>
              <div style={{ marginTop: 14, fontSize: 'clamp(14px,1.2vw,17px)', fontWeight: 600, color: '#fff' }}>{s.label}</div>
            </div>
          ))}
        </Spot>
      </section>

      <section data-wrap="" data-why="" style={{ maxWidth: 1280, margin: '0 auto', padding: '78px 40px 0', display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 84, alignItems: 'center' }}>
        <div style={{ order: 1 }}>
          <div data-reveal="right" style={badge}>چرا های مصالح؟</div>
          <h2 data-reveal="right" data-delay="1" style={{ margin: '16px 0 0', fontSize: 'clamp(30px,3.1vw,40px)', lineHeight: 1.55, fontWeight: 900, color: '#141414' }}>مزایایی که ما را<br />متمایز می‌کند</h2>
          <p data-reveal="right" data-delay="2" style={{ margin: '26px 0 0', fontSize: 16, lineHeight: 2.1, color: '#6B6B6B', maxWidth: 440, textWrap: 'pretty' }}>ما با تکیه بر کیفیت و تعهد، بهترین مصالح ساختمانی را با قیمت مناسب برای ساخت آینده‌ای بهتر فراهم می‌کنیم.</p>
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
            {PERKS.map((t, i) => (
              <div key={t} data-reveal="right" data-delay={i + 2} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, color: '#3A3A3A', fontWeight: 500 }}><Icon name="circle-check" size={22} style={{ color: '#FF5B0F' }} />{t}</div>
            ))}
          </div>
          <div data-reveal="right" data-delay="3">
            <Link data-btn="" data-hv-glow="" href="/about" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginTop: 42, background: '#FF5B0F', color: '#fff', fontSize: 16, fontWeight: 700, padding: '17px 32px', borderRadius: 12 }}>
              درباره ما بیشتر بدانید<Icon name="chevron-left" size={17} />
            </Link>
          </div>
        </div>
        <div data-reveal="left" style={{ order: 2 }}>
          <div data-card="" style={{ borderRadius: 22, overflow: 'hidden', aspectRatio: 1.39, background: '#222', boxShadow: '0 24px 60px rgba(0,0,0,0.16)' }}>
            <div data-zoom="" style={{ width: '100%', height: '100%', background: "url('/warehouse.jpg') center/cover no-repeat" }} />
          </div>
        </div>
      </section>

      <section data-wrap="" style={{ maxWidth: 1280, margin: '0 auto', padding: '90px 40px 0' }}>
        <div data-drv="" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(0,1fr)', gap: 70, alignItems: 'center' }}>
          <div>
            <div data-reveal="right" style={{ ...badge, alignItems: 'center', gap: 6 }}><Icon name="truck" size={16} />همکاری با رانندگان</div>
            <h2 data-reveal="right" data-delay="1" style={{ margin: '16px 0 0', fontSize: 'clamp(28px,3vw,40px)', lineHeight: 1.6, fontWeight: 900, color: '#141414' }}>ماشین داری؟<br />در شهر خودت با ما بار بزن</h2>
            <p data-reveal="right" data-delay="2" style={{ margin: '20px 0 0', fontSize: 16, lineHeight: 2.1, color: '#6B6B6B', maxWidth: 500, textWrap: 'pretty' }}>یک‌بار ثبت‌نام کنید و مدارک را بارگذاری کنید. هر وقت در شهر شما سفارشی ثبت شود و مصالح‌فروشی همان شهر موجودی داشته باشد، بار برای شما ارسال می‌شود.</p>
            <div data-drv-steps="" style={{ marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 12 }}>
              {DRIVER_STEPS.map((d, i) => (
                <div key={d.title} data-reveal="right" data-delay={i + 2} style={{ background: '#FAFAFA', border: '1px solid #F0F0F0', borderRadius: 16, padding: 16 }}>
                  <span style={{ width: 40, height: 40, borderRadius: 12, background: '#FFF0E8', color: '#FF5B0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={d.icon} size={21} /></span>
                  <div style={{ marginTop: 12, fontSize: 15, fontWeight: 800, color: '#141414' }}>{d.title}</div>
                  <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.8, color: '#888' }}>{d.desc}</div>
                </div>
              ))}
            </div>
            <div data-reveal="right" data-delay="4" style={{ marginTop: 30, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link data-btn="" data-hv-glow="" href="/login?mode=register&role=driver" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#FF5B0F', color: '#fff', fontSize: 16, fontWeight: 800, padding: '17px 30px', borderRadius: 12, boxShadow: '0 14px 30px rgba(255,91,15,.35)' }}>
                <Icon name="id" size={19} />ثبت‌نام راننده
              </Link>
              <Link data-btn="" data-hv-dark="" href="/login?role=driver" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, border: '1.5px solid #141414', color: '#141414', fontSize: 16, fontWeight: 700, padding: '16px 26px', borderRadius: 12 }}>
                ورود رانندگان<Icon name="chevron-left" size={17} />
              </Link>
            </div>
            <div data-reveal="right" data-delay="5" style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#666' }}>
              <Icon name="building-store" size={19} style={{ color: '#FF5B0F' }} />مصالح‌فروش هستید؟ <Link href="/login?mode=register&role=supplier" style={{ color: '#FF5B0F', fontWeight: 800 }}>استعلام‌های شهرتان را دریافت کنید</Link>
            </div>
          </div>
          <div data-reveal="left" style={{ position: 'relative', borderRadius: 26, overflow: 'hidden', minHeight: 460, background: '#161616', boxShadow: '0 30px 70px rgba(0,0,0,.18)' }}>
            <div data-zoom="" style={{ position: 'absolute', inset: 0, background: "url('/c2.jpg') center/cover", opacity: 0.45 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg,rgba(22,22,22,.2),#161616 80%)' }} />
            <div className="hm-float" style={{ position: 'absolute', right: '8%', left: '8%', top: '12%', background: '#fff', borderRadius: 20, padding: 18, boxShadow: '0 24px 60px rgba(0,0,0,.35)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}><span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 900, color: '#141414' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22B35E', boxShadow: '0 0 0 4px #E3F6EA' }} />نمونه بار در پنل راننده</span><span style={{ fontSize: 12, fontWeight: 800, color: '#E4500A' }}>{toFaDigits('04:59')}</span></div>
              <div style={{ marginTop: 12, fontSize: 16, fontWeight: 900, color: '#141414' }}>سیمان پرتلند تیپ ۲ — ۲۰۰ کیسه</div>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#555' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="building-store" size={16} style={{ color: '#FF5B0F' }} />مبدا: مصالح‌فروشی همکار</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="map-pin" size={16} style={{ color: '#1F9D55' }} />مقصد: کارگاه مشتری</span>
              </div>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}><div><div style={{ fontSize: 11, color: '#999' }}>کرایه</div><div style={{ fontSize: 17, fontWeight: 900, color: '#141414' }}>به‌صورت شفاف در پنل</div></div><span style={{ background: '#FF5B0F', color: '#fff', borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 800 }}>قبول بار</span></div>
            </div>
            <div style={{ position: 'absolute', right: '8%', bottom: '9%', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,.1)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,.18)', borderRadius: 16, padding: '12px 16px', color: '#fff' }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, background: '#FF5B0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="file-invoice" size={21} /></span>
              <div><div style={{ fontSize: 14, fontWeight: 800 }}>برگ حمل الکترونیکی</div><div style={{ fontSize: 12, color: '#CCC' }}>نکات بار در پنل راننده</div></div>
            </div>
          </div>
        </div>
      </section>

      <section data-wrap="" style={{ maxWidth: 1280, margin: '0 auto', padding: '60px 40px 90px' }}>
        <Spot data-reveal="" data-cta="" style={{ position: 'relative', overflow: 'hidden', background: 'radial-gradient(560px circle at var(--mx,20%) var(--my,50%),rgba(255,91,15,.18),transparent 45%),#181818', borderRadius: 22, padding: '54px 72px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40, flexWrap: 'wrap', border: '1px solid #262626' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '48%', background: "url('/ctabg.jpg') left center/cover no-repeat", opacity: 0.5, WebkitMaskImage: 'linear-gradient(to left,transparent,#000 60%)', maskImage: 'linear-gradient(to left,transparent,#000 60%)', pointerEvents: 'none' }} />
          <h3 style={{ position: 'relative', margin: 0, fontSize: 'clamp(22px,2.5vw,34px)', lineHeight: 1.75, fontWeight: 800, color: '#fff' }}>برای دریافت مشاوره<br />و استعلام قیمت با ما در ارتباط باشید</h3>
          <div data-cta-btns="" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 18, width: 270, maxWidth: '100%' }}>
            <Link data-btn="" data-hv-glow="" href="/contact" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FF5B0F', color: '#fff', fontSize: 16, fontWeight: 700, padding: '17px 26px', borderRadius: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="phone" size={18} />تماس با ما</span><Icon name="chevron-left" size={17} />
            </Link>
            <ConsultTrigger hover="invert-light" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1.5px solid #fff', background: 'transparent', color: '#fff', fontSize: 16, fontWeight: 700, padding: '16px 26px', borderRadius: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="message-2" size={18} />درخواست مشاوره</span><Icon name="chevron-left" size={17} />
            </ConsultTrigger>
          </div>
        </Spot>
      </section>
    </PublicPage>
  );
}

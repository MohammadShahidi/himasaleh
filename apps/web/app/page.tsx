import Link from 'next/link';
import { Icon } from '@/components/icon';
import { ConsultButton } from '@/components/site/consult-button';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';

// Placeholder body until the home page is built (phase 4); header and footer are final.
export default function Home() {
  return (
    <>
      <SiteHeader active="home" />
      <section style={{ position: 'relative', background: '#121212', color: '#fff', overflow: 'hidden', padding: '200px 0 140px', borderBottomLeftRadius: '62% 120px' }}>
        <div style={{ position: 'absolute', inset: 0, background: "url('/hero.jpg') left center/cover no-repeat", opacity: 0.4, WebkitMaskImage: 'linear-gradient(to left,transparent,#000 70%)', maskImage: 'linear-gradient(to left,transparent,#000 70%)' }} />
        <div data-wrap="" style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '0 40px' }}>
          <h1 data-reveal="" style={{ margin: 0, fontSize: 'clamp(34px,4vw,56px)', fontWeight: 900, lineHeight: 1.35 }}>
            <span style={{ color: '#FF5B0F' }}>های</span> مصالح
          </h1>
          <p data-reveal="" data-delay="1" style={{ margin: '20px 0 0', fontSize: 'clamp(15px,1.4vw,19px)', lineHeight: 2, color: '#D8D8D8', maxWidth: 560 }}>
            تامین و حمل مصالح ساختمانی — نسخهٔ در حال ساخت
          </p>
          <div data-reveal="" data-delay="2" style={{ marginTop: 32, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link data-btn="" href="/login" style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FF5B0F', color: '#fff', fontSize: 16, fontWeight: 800, padding: '15px 26px', borderRadius: 12 }}>
              <Icon name="user-circle" size={20} />ورود / ثبت‌نام
            </Link>
            <ConsultButton />
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}

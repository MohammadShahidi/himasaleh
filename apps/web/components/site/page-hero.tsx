// Port of design/project/PageHero.dc.html (hero band of inner public pages).
import Link from 'next/link';
import { Icon } from '@/components/icon';

export function PageHero({ title, subtitle, crumb = title, img = '/hero.jpg' }: { title: string; subtitle: string; crumb?: string; img?: string }) {
  return (
    <section dir="rtl" data-phero="" style={{ position: 'relative', background: '#121212', color: '#fff', borderBottomLeftRadius: '62% 120px', overflow: 'hidden', padding: '200px 0 130px' }}>
      <div data-phero-img="" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '55%', opacity: 0.6, background: `url('${img}') center/cover no-repeat`, WebkitMaskImage: 'linear-gradient(to left,transparent 0%,#000 55%)', maskImage: 'linear-gradient(to left,transparent 0%,#000 55%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 180, background: 'linear-gradient(#121212,rgba(18,18,18,0))' }} />
      <div style={{ position: 'absolute', right: '-8%', top: '-30%', width: '50%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,91,15,.16),transparent 62%)', pointerEvents: 'none' }} />
      <div data-wrap="" data-phero-inner="" style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '0 40px' }}>
        <div data-reveal="" data-phero-crumb="" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: '#bbb' }}>
          <Link data-phero-link="" href="/" style={{ color: '#bbb', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="home" size={16} />خانه</Link>
          <Icon name="chevron-left" size={14} style={{ color: '#666' }} />
          <span style={{ color: '#FF5B0F' }}>{crumb}</span>
        </div>
        <h1 data-reveal="" data-delay="1" style={{ margin: '22px 0 0', fontSize: 'clamp(34px,4vw,56px)', fontWeight: 900, lineHeight: 1.35 }}>{title}</h1>
        <p data-reveal="" data-delay="2" style={{ margin: '20px 0 0', fontSize: 'clamp(15px,1.4vw,19px)', lineHeight: 2, color: '#D8D8D8', maxWidth: 560, textWrap: 'pretty' }}>{subtitle}</p>
      </div>
    </section>
  );
}

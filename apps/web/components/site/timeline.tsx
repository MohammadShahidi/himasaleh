'use client';

// Timeline of design/project/about.dc.html: the orange line draws itself when it scrolls into view.
import { useEffect, useRef } from 'react';

export interface Milestone { y: string; title: string; desc: string }

export function Timeline({ items }: { items: Milestone[] }) {
  const line = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = line.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      el.style.transform = 'none';
      return;
    }
    const io = new IntersectionObserver((ents) => {
      if (!ents[0]?.isIntersecting) return;
      el.style.transform = 'scaleX(1)';
      io.disconnect();
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div style={{ position: 'relative', marginTop: 60 }}>
      <div ref={line} data-tl-line="" style={{ position: 'absolute', top: 10, right: '10%', left: '10%', height: 2, background: 'linear-gradient(to left,#FF5B0F,#FFC9AE)', transformOrigin: 'right', transform: 'scaleX(0)', transition: 'transform 1.6s cubic-bezier(.2,.8,.2,1)' }} />
      <div data-tl="" style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${items.length},minmax(0,1fr))`, gap: 20 }}>
        {items.map((t, i) => (
          <div key={t.y + t.title} data-reveal="" data-delay={i}>
            <div data-tl-item="" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18 }}>
              <span data-tl-dot="" style={{ width: 22, height: 22, flex: 'none', borderRadius: '50%', background: '#fff', border: '4px solid #FF5B0F', boxShadow: '0 0 0 6px #FFF0E8' }} />
              <div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#FF5B0F' }}>{t.y}</div>
                <div style={{ marginTop: 6, fontSize: 16, fontWeight: 800, color: '#141414' }}>{t.title}</div>
                <div style={{ marginTop: 6, fontSize: 14, lineHeight: 1.9, color: '#777' }}>{t.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef } from 'react';

/** Right-hand photo of the home hero: slow Ken Burns zoom, glowing orb and scroll parallax. */
export function HeroVisual({ img }: { img: string }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const el = box.current;
      if (!el) return;
      const y = window.scrollY;
      el.style.transform = window.innerWidth > 900 && y < 1000 ? `translateY(${y * 0.18}px)` : '';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={box} data-hero-img="" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 'min(56%,calc(100% - 560px))', WebkitMaskImage: 'linear-gradient(to left,transparent 0%,#000 30%)', maskImage: 'linear-gradient(to left,transparent 0%,#000 30%)', overflow: 'hidden' }}>
      <div className="hm-kb" style={{ position: 'absolute', inset: 0, background: `url('${img}') center/cover no-repeat` }} />
      <div className="hm-orb" style={{ position: 'absolute', left: '38%', top: '30%', width: '34%', aspectRatio: '1', borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,110,30,.45),transparent 65%)', mixBlendMode: 'screen', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '30%', background: 'linear-gradient(#121212,rgba(18,18,18,0))' }} />
    </div>
  );
}

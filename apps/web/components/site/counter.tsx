'use client';

import { toFaDigits } from '@hm/shared';
import { useEffect, useRef, useState } from 'react';

/** Counts up to `to` once the element is on screen (instantly with reduced motion). */
export function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      setN(to);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver((ents) => {
      if (!ents[0]?.isIntersecting) return;
      io.disconnect();
      const st = performance.now(), dur = 1800;
      const tick = (now: number) => {
        const k = Math.min(1, (now - st) / dur);
        setN(Math.round(to * (k === 1 ? 1 : 1 - Math.pow(2, -10 * k))));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to]);

  return <span ref={ref}>{toFaDigits(n)}{suffix}</span>;
}

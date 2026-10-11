'use client';

// Home category strip: drifts to the right on its own, and can be dragged with the mouse, swiped, scrolled with the wheel
// or trackpad at any speed. Three copies of the list make it endless in both directions; the position is wrapped into
// the middle copy. Auto-drift pauses while the pointer hovers or the user interacts and resumes shortly after.
import Link from 'next/link';
import { type MouseEvent, type PointerEvent, useEffect, useRef } from 'react';
import { Icon } from '@/components/icon';
import { CATEGORIES, categoryHref } from '@/lib/site';

const SPEED = 30; // px per second
const RESUME_AFTER_MS = 1600;

export function CategoryStrip() {
  const box = useRef<HTMLDivElement>(null);
  const hovering = useRef(false);
  const drag = useRef<{ x: number; moved: number } | null>(null);
  const lastUser = useRef(0);
  const lastSet = useRef<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // In RTL scrollLeft runs 0 → negative; work with a positive offset x = -scrollLeft (copy width S).
    const setX = (x: number) => { lastSet.current = -x; el.scrollLeft = -x; };
    const getX = () => -el.scrollLeft;
    const copy = () => el.scrollWidth / 3;

    setX(copy());
    let raf = 0;
    let prev = performance.now();
    let pos = copy();

    const onScroll = () => {
      // A scroll we did not cause (touch, wheel, scrollbar, drag) counts as the user's.
      if (lastSet.current === null || Math.abs(el.scrollLeft - lastSet.current) > 1.5) lastUser.current = performance.now();
    };
    el.addEventListener('scroll', onScroll, { passive: true });

    const tick = (now: number) => {
      const dt = Math.min(0.25, (now - prev) / 1000);
      prev = now;
      const S = copy();
      const idle = !hovering.current && !drag.current && now - lastUser.current > RESUME_AFTER_MS;
      if (idle && !reduce) pos += SPEED * dt; // content drifts right = offset grows
      else pos = getX();
      if (S > 0) {
        if (pos >= 2 * S) pos -= S;
        else if (pos < S) pos += S;
      }
      if (idle && !reduce) setX(pos);
      else if (pos !== getX()) setX(pos); // wrapped while the user was scrolling
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); el.removeEventListener('scroll', onScroll); };
  }, []);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return; // touch and pen scroll natively
    drag.current = { x: e.clientX, moved: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    lastUser.current = performance.now();
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    d.x = e.clientX;
    d.moved += Math.abs(dx);
    e.currentTarget.scrollLeft -= dx; // the content follows the pointer
    lastUser.current = performance.now();
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    // Keep `moved` readable for the click that follows the release, then clear it.
    setTimeout(() => { drag.current = null; }, 0);
    lastUser.current = performance.now();
  };
  const swallowClick = (e: MouseEvent<HTMLDivElement>) => {
    if (drag.current && drag.current.moved > 5) { e.preventDefault(); e.stopPropagation(); }
  };

  return (
    <div
      ref={box}
      className="hm-marquee"
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') hovering.current = true; }}
      onPointerLeave={() => { hovering.current = false; }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onClickCapture={swallowClick}
      onDragStart={(e) => e.preventDefault()}
      style={{ marginTop: 52 }}
    >
      <div className="hm-marquee-track">
        {[0, 1, 2].flatMap((copy) =>
          CATEGORIES.map((c) => (
            <Link key={`${copy}-${c.key}`} data-card="" data-lift="" href={categoryHref(c.key)} draggable={false} {...(copy ? { 'aria-hidden': true, tabIndex: -1 } : {})} className="hm-marquee-card" style={{ display: 'block', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
              <div style={{ aspectRatio: 1.25, overflow: 'hidden' }}><div data-zoom="" style={{ width: '100%', height: '100%', backgroundImage: `url('${c.img}')`, backgroundSize: 'cover', backgroundPosition: 'center' }} /></div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '20px 6px', fontSize: 16, fontWeight: 700, color: '#141414', whiteSpace: 'nowrap' }}>
                <Icon name={c.icon} size={24} style={{ color: '#FF5B0F' }} /><span>{c.name}</span>
              </div>
            </Link>
          )),
        )}
      </div>
    </div>
  );
}

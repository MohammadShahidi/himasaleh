'use client';

import type { CSSProperties, ReactNode } from 'react';
import { openConsult } from '@/lib/site';

/** Any styled button that opens the consultation form; the pages pass the design's inline style. */
export function ConsultTrigger({ style, children, topic, ctx, hover }: { style: CSSProperties; children: ReactNode; topic?: string; ctx?: string; hover?: 'invert-light' | 'invert-dark' | 'glow' }) {
  return (
    <button type="button" data-btn="" data-hv={hover} onClick={() => openConsult({ ...(topic ? { topic } : {}), ...(ctx ? { ctx } : {}) })} style={style}>
      {children}
    </button>
  );
}

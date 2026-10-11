'use client';

import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

/** A box whose radial highlight follows the pointer (the designs' `spot` handler sets --mx/--my). */
export function Spot({ style, children, ...rest }: { style?: CSSProperties; children: ReactNode } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      style={style}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
      }}
    >
      {children}
    </div>
  );
}

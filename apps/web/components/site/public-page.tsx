import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import type { SiteSection } from '@/lib/site';

/** White page frame shared by every public page (the designs' outer div). */
export function PublicPage({ active, children }: { active: SiteSection; children: ReactNode }) {
  return (
    <>
      <SiteHeader active={active} />
      <div dir="rtl" style={{ background: '#fff', minWidth: 0, overflowX: 'clip' }}>{children}</div>
      <SiteFooter />
    </>
  );
}

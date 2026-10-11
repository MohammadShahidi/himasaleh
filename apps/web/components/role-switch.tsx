'use client';

// Port of design/project/RoleSwitch.dc.html: «نقش من» bar, shown only when the account has more than one role.
// When the role buttons don't fit the available width the bar collapses into a dropdown (no horizontal scrolling).
import type { Role, SessionUser } from '@hm/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/icon';
import { api } from '@/lib/api';

export const ROLE_UI: Record<Role, { icon: IconName; label: string; home: string }> = {
  personal: { icon: 'user', label: 'شخصی', home: '/account' },
  contractor: { icon: 'helmet', label: 'پیمانکار', home: '/account' },
  driver: { icon: 'steering-wheel', label: 'راننده', home: '/driver' },
  supplier: { icon: 'building-store', label: 'مصالح‌فروش', home: '/supplier' },
  staff: { icon: 'shield-lock', label: 'مدیریت', home: '/admin' },
};

const btnStyle = { minHeight: 52, border: 'none', borderRadius: 14, background: 'rgba(255,255,255,.08)', color: '#DDD', padding: '6px 14px', fontSize: 15, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap' } as const;

export function RoleSwitch({ user, radius = 18 }: { user: SessionUser; radius?: number }) {
  const router = useRouter();
  const qc = useQueryClient();
  const sw = useMutation({
    mutationFn: (role: Role) => api<SessionUser>('/auth/role', { method: 'POST', json: { role } }),
    onSuccess: (u) => {
      qc.setQueryData(['me'], u);
      router.push(ROLE_UI[u.activeRole].home);
    },
  });

  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);
  const multi = user.roles.length > 1;

  // Compact (dropdown) mode when the buttons' natural width no longer fits.
  useLayoutEffect(() => {
    const wrap = wrapRef.current, m = measureRef.current;
    if (!wrap || !m) return;
    const check = () => setCompact(m.scrollWidth > wrap.clientWidth);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [multi, user.roles.length]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!multi) return null;

  const pick = (r: Role) => { setOpen(false); if (r !== user.activeRole) sw.mutate(r); };
  const cur = ROLE_UI[user.activeRole];

  return (
    <div dir="rtl" style={{ background: '#141414', color: '#fff', borderRadius: radius, padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 6, padding: '0 6px 0 4px', fontSize: 13, fontWeight: 800, color: '#BBB', whiteSpace: 'nowrap' }}>
        <Icon name="switch-horizontal" size={18} style={{ color: '#FF8A4F' }} />نقش من
      </span>
      <div ref={wrapRef} style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        {/* invisible copy used only to measure the width the buttons need */}
        <div ref={measureRef} aria-hidden="true" style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', height: 0, overflow: 'hidden', display: 'flex', gap: 6, width: 'max-content' }}>
          {user.roles.map((r) => (
            <span key={r} style={{ ...btnStyle, flex: 'none' }}><Icon name={ROLE_UI[r].icon} size={22} />{ROLE_UI[r].label}<Icon name="check" size={16} /></span>
          ))}
        </div>
        {compact ? (
          <>
            <button type="button" data-rs-b="" data-active="1" aria-haspopup="listbox" aria-expanded={open} disabled={sw.isPending}
              onClick={() => setOpen((o) => !o)} style={{ ...btnStyle, width: '100%', justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name={sw.isPending ? 'loader-2' : cur.icon} size={22} className={sw.isPending ? 'hm-spin' : undefined} />{cur.label}
              </span>
              <Icon name="chevron-down" size={18} style={{ transition: 'transform .3s', transform: open ? 'rotate(180deg)' : 'none' }} />
            </button>
            {open && (
              <div role="listbox" style={{ position: 'absolute', top: 'calc(100% + 8px)', insetInline: 0, zIndex: 50, background: '#1E1E1E', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: 6, display: 'flex', flexDirection: 'column', gap: 4, boxShadow: '0 16px 36px rgba(0,0,0,.35)' }}>
                {user.roles.map((r) => {
                  const ui = ROLE_UI[r], active = r === user.activeRole;
                  return (
                    <button key={r} type="button" role="option" aria-selected={active} data-rs-b="" data-active={active ? '1' : '0'} onClick={() => pick(r)}
                      style={{ ...btnStyle, justifyContent: 'flex-start', width: '100%' }}>
                      <Icon name={ui.icon} size={22} />{ui.label}
                      {active && <Icon name="check" size={16} style={{ marginInlineStart: 'auto' }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div data-rs-row="" style={{ display: 'flex', gap: 6 }}>
            {user.roles.map((r) => {
              const ui = ROLE_UI[r], isCur = r === user.activeRole;
              return (
                <button key={r} data-rs-b="" data-active={isCur ? '1' : '0'} aria-current={isCur} disabled={sw.isPending}
                  onClick={() => pick(r)} style={{ ...btnStyle, flex: '1 0 auto' }}>
                  <Icon name={sw.isPending && sw.variables === r ? 'loader-2' : ui.icon} size={22} className={sw.isPending && sw.variables === r ? 'hm-spin' : undefined} />
                  {ui.label}
                  {isCur && <Icon name="check" size={16} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

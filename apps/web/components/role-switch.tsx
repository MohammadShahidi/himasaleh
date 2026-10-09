'use client';

// Port of design/project/RoleSwitch.dc.html: «نقش من» bar, shown only when the account has more than one role.
import type { Role, SessionUser } from '@hm/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Icon, type IconName } from '@/components/icon';
import { api } from '@/lib/api';

export const ROLE_UI: Record<Role, { icon: IconName; label: string; home: string }> = {
  personal: { icon: 'user', label: 'شخصی', home: '/account' },
  contractor: { icon: 'helmet', label: 'پیمانکار', home: '/account' },
  driver: { icon: 'steering-wheel', label: 'راننده', home: '/driver' },
  supplier: { icon: 'building-store', label: 'مصالح‌فروش', home: '/supplier' },
  staff: { icon: 'shield-lock', label: 'مدیریت', home: '/admin' },
};

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

  if (user.roles.length < 2) return null;
  return (
    <div dir="rtl" style={{ background: '#141414', color: '#fff', borderRadius: radius, padding: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 6, padding: '0 6px 0 4px', fontSize: 13, fontWeight: 800, color: '#BBB', whiteSpace: 'nowrap' }}>
        <Icon name="switch-horizontal" size={18} style={{ color: '#FF8A4F' }} />نقش من
      </span>
      <div data-rs-row="" style={{ flex: 1, minWidth: 0, display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {user.roles.map((r) => {
          const ui = ROLE_UI[r], cur = r === user.activeRole;
          return (
            <button key={r} data-rs-b="" data-active={cur ? '1' : '0'} aria-current={cur} disabled={sw.isPending}
              onClick={() => { if (!cur) sw.mutate(r); }}
              style={{ flex: '1 0 auto', minHeight: 52, border: 'none', borderRadius: 14, background: 'rgba(255,255,255,.08)', color: '#DDD', padding: '6px 14px', fontSize: 15, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, whiteSpace: 'nowrap' }}>
              <Icon name={sw.isPending && sw.variables === r ? 'loader-2' : ui.icon} size={22} className={sw.isPending && sw.variables === r ? 'hm-spin' : undefined} />
              {ui.label}
              {cur && <Icon name="check" size={16} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

'use client';

// Temporary landing for each role until its real panel is built (phases 1–3).
// It already uses the final RoleSwitch, so switching roles can be tried end to end.
import { type Role, toFaDigits } from '@hm/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icon';
import { ROLE_UI, RoleSwitch } from '@/components/role-switch';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';

export function PanelPlaceholder({ roles, title, phase }: { roles: Role[]; title: string; phase: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, forbidden } = useSession(roles);
  const logout = useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSuccess: () => { qc.clear(); router.replace('/login'); },
  });

  if (!user) return <main style={{ padding: 24, textAlign: 'center', color: '#888' }}>در حال بارگذاری…</main>;
  if (forbidden) {
    router.replace(ROLE_UI[user.activeRole].home);
    return null;
  }

  return (
    <main dir="rtl" style={{ minHeight: '100dvh', background: '#F4F4F5', padding: 'calc(16px + env(safe-area-inset-top)) 16px 24px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <RoleSwitch user={user} radius={16} />
        <section style={{ background: '#fff', border: '1px solid #EFEFEF', borderRadius: 22, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 48, height: 48, borderRadius: 14, background: '#FFF0E8', color: '#FF5B0F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={ROLE_UI[user.activeRole].icon} size={26} />
            </span>
            <div>
              <div style={{ fontSize: 13, color: '#888' }}>{title}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#141414' }}>سلام {user.fullName ?? ''}</div>
            </div>
          </div>
          <p style={{ margin: '16px 0 0', fontSize: 15, color: '#666', lineHeight: 1.9 }}>این پنل در {phase} ساخته می‌شود.</p>
          <p dir="ltr" style={{ margin: '8px 0 0', fontSize: 14, color: '#999', textAlign: 'right' }}>{toFaDigits(user.phone)}</p>
        </section>
        <button onClick={() => logout.mutate()} style={{ height: 52, borderRadius: 14, border: '1.5px solid #E2E2E2', background: '#fff', color: '#666', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
          خروج از حساب
        </button>
      </div>
    </main>
  );
}

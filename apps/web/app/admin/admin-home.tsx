'use client';

// Temporary admin landing (phase 1): driver document review and the test-load tool. The real panel is phase 3.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ROLE_UI, RoleSwitch } from '@/components/role-switch';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { KycReview, TestTripTool } from './kyc-review';

export function AdminHome() {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, forbidden } = useSession(['staff']);
  const logout = useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSuccess: () => { qc.clear(); router.replace('/login'); },
  });
  if (!user) return <main style={{ padding: 24, textAlign: 'center', color: '#888' }}>در حال بارگذاری…</main>;
  if (forbidden) { router.replace(ROLE_UI[user.activeRole].home); return null; }
  return (
    <main dir="rtl" style={{ minHeight: '100dvh', background: '#F4F4F5', padding: 'calc(16px + env(safe-area-inset-top)) 16px 24px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <RoleSwitch user={user} radius={16} />
        <KycReview />
        <TestTripTool />
        <button onClick={() => logout.mutate()} style={{ height: 52, borderRadius: 14, border: '1.5px solid #E2E2E2', background: '#fff', color: '#666', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>خروج از حساب</button>
      </div>
    </main>
  );
}

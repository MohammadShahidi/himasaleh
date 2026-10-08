'use client';

// Temporary landing after sign-in; each role gets its real panel in phases 1–3.
import { ROLE_LABELS, type Role, type SessionUser, toFaDigits } from '@hm/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ApiError, api } from '@/lib/api';

export default function Account() {
  const router = useRouter();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api<SessionUser>('/auth/me'), refetchInterval: false });
  const switchRole = useMutation({
    mutationFn: (role: Role) => api<SessionUser>('/auth/role', { method: 'POST', json: { role } }),
    onSuccess: (u) => qc.setQueryData(['me'], u),
  });
  const logout = useMutation({
    mutationFn: () => api('/auth/logout', { method: 'POST' }),
    onSuccess: () => router.replace('/login'),
  });

  useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 401) router.replace('/login');
  }, [me.error, router]);

  if (!me.data) return <main className="p-6 text-center text-muted">در حال بارگذاری…</main>;
  const u = me.data;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 p-5">
      {/* «تغییر نقش»: always visible and simple for accounts with several roles. */}
      {u.roles.length > 1 && (
        <div className="flex gap-2 rounded-2xl bg-ink p-2">
          {u.roles.map((r) => (
            <button key={r} onClick={() => switchRole.mutate(r)} disabled={switchRole.isPending}
              className={`h-12 flex-1 rounded-xl font-extrabold ${r === u.activeRole ? 'bg-orange text-white' : 'text-[#bdbdbd]'}`}>
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      )}
      <section className="rounded-[var(--radius-card)] border border-line bg-white p-6">
        <p className="text-sm text-muted">نقش فعال: {ROLE_LABELS[u.activeRole]}</p>
        <h1 className="mt-1 text-2xl font-black text-ink">سلام {u.fullName ?? ''}</h1>
        <p className="mt-2 text-muted" dir="ltr">{toFaDigits(u.phone)}</p>
        <p className="mt-4 text-sm text-muted">پنل این نقش در فازهای بعد ساخته می‌شود.</p>
      </section>
      <button onClick={() => logout.mutate()} className="h-12 rounded-xl border-[1.5px] border-[#e2e2e2] bg-white font-bold text-[#666]">
        خروج از حساب
      </button>
    </main>
  );
}

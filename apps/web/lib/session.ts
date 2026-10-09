'use client';

import type { Role, SessionUser } from '@hm/shared';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ApiError, api } from './api';

/** Current account; sends the visitor to /login when signed out or when the active role is not allowed here. */
export function useSession(allowed?: Role[]) {
  const router = useRouter();
  const q = useQuery({ queryKey: ['me'], queryFn: () => api<SessionUser>('/auth/me'), refetchInterval: false, retry: false });
  useEffect(() => {
    if (q.error instanceof ApiError && q.error.status === 401) router.replace('/login');
  }, [q.error, router]);
  const forbidden = !!q.data && !!allowed && !allowed.includes(q.data.activeRole);
  return { user: q.data, loading: q.isLoading, forbidden };
}

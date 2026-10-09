import { deviceId } from './device';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time, shared by every request that hit an expired access token. */
function refreshOnce(): Promise<boolean> {
  refreshing ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}, retried = false): Promise<T> {
  const headers = new Headers(init.headers);
  const dev = deviceId();
  if (dev) headers.set('x-device-id', dev);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set('content-type', 'application/json');
    body = JSON.stringify(init.json);
  }
  const res = await fetch(`/api${path}`, { ...init, headers, body, credentials: 'include' });

  if (res.status === 401 && !retried && !path.startsWith('/auth/')) {
    if (await refreshOnce()) return api<T>(path, init, true);
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const { code, message, ...extra } = data;
    throw new ApiError(res.status, String(code ?? 'HTTP_' + res.status), String(message ?? 'خطایی پیش آمد. دوباره امتحان کنید.'), extra);
  }
  return data as T;
}

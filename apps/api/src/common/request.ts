import type { Request } from 'express';

export interface AuthUser {
  id: string;
  role: import('@hm/shared').Role;
  roles: import('@hm/shared').Role[];
}

export type AppRequest = Request & { user?: AuthUser };

/** Client-generated id stored in the browser; weak, but lets us rate-limit per device behind shared IPs. */
export function deviceIdOf(req: Request): string | null {
  const v = req.header('x-device-id');
  return v && /^[A-Za-z0-9-]{8,64}$/.test(v) ? v : null;
}

export function ipOf(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

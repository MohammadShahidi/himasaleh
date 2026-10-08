import { createHash, randomBytes } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@hm/shared';
import type { CookieOptions, Response } from 'express';
import { AppError } from '../common/errors.js';
import type { AuthUser } from '../common/request.js';
import { ENV, type Env } from '../env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';

export const ACCESS_COOKIE = 'hm_at';
export const REFRESH_COOKIE = 'hm_rt';
const ACCESS_TTL_SEC = 15 * 60;
const REFRESH_TTL_DAYS = 30;

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

/**
 * Short-lived access JWT + rotating refresh token, both in httpOnly cookies.
 * Reusing a refresh token that was already rotated revokes every session of that user.
 */
@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async issue(res: Response, userId: string, activeRole: Role) {
    const roles = await this.users.rolesOf(userId);
    if (!roles.includes(activeRole)) throw new AppError(HttpStatus.FORBIDDEN, 'ROLE_NOT_HELD', 'این نقش برای حساب شما فعال نیست.');
    const access = await this.jwt.signAsync({ sub: userId, role: activeRole, roles } satisfies Omit<AuthUser, 'id'> & { sub: string }, {
      expiresIn: ACCESS_TTL_SEC,
    });
    const refresh = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: { userId, activeRole, tokenHash: sha256(refresh), expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 86400_000) },
    });
    res.cookie(ACCESS_COOKIE, access, this.cookie('/', ACCESS_TTL_SEC));
    res.cookie(REFRESH_COOKIE, refresh, this.cookie('/api/auth', REFRESH_TTL_DAYS * 86400));
  }

  async refresh(res: Response, token: string | undefined): Promise<{ userId: string; activeRole: Role }> {
    const fail = () => new AppError(HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED', 'دوباره وارد شوید.');
    if (!token) throw fail();
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(token) } });
    if (!row) throw fail();
    if (row.revokedAt) {
      await this.revokeAll(row.userId);
      throw fail();
    }
    if (row.expiresAt < new Date()) throw fail();
    await this.prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
    await this.issue(res, row.userId, row.activeRole);
    return { userId: row.userId, activeRole: row.activeRole };
  }

  /** Sign-out: invalidates the refresh token and clears both cookies. */
  async revoke(res: Response, token: string | undefined) {
    await this.revokeToken(token);
    res.clearCookie(ACCESS_COOKIE, this.cookie('/'));
    res.clearCookie(REFRESH_COOKIE, this.cookie('/api/auth'));
  }

  /** Invalidates one refresh token without touching cookies (used after issuing its replacement). */
  async revokeToken(token: string | undefined) {
    if (token) await this.prisma.refreshToken.updateMany({ where: { tokenHash: sha256(token), revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async revokeAll(userId: string) {
    await this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async verifyAccess(token: string): Promise<AuthUser | null> {
    try {
      const p = await this.jwt.verifyAsync<{ sub: string; role: Role; roles: Role[] }>(token);
      return { id: p.sub, role: p.role, roles: p.roles };
    } catch {
      return null;
    }
  }

  private cookie(path: string, maxAgeSec?: number): CookieOptions {
    return {
      httpOnly: true, sameSite: 'lax', secure: this.env.COOKIE_SECURE, path,
      ...(maxAgeSec ? { maxAge: maxAgeSec * 1000 } : {}),
    };
  }
}

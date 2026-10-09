import { type CanActivate, type ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '@hm/shared';
import { AppError } from '../common/errors.js';
import type { AppRequest } from '../common/request.js';
import { IS_PUBLIC, ROLES_KEY } from './decorators.js';
import { ACCESS_COOKIE, TokensService } from './tokens.service.js';

/** Global guard: every endpoint needs a valid access token unless marked @Public(). */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokensService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest<AppRequest>();
    const bearer = req.header('authorization')?.replace(/^Bearer /i, '');
    const token = (req.cookies as Record<string, string> | undefined)?.[ACCESS_COOKIE] ?? bearer;
    const user = token ? await this.tokens.verifyAccess(token) : null;
    if (!user) throw new AppError(HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED', 'دوباره وارد شوید.');
    req.user = user;

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, targets);
    if (roles?.length && !roles.includes(user.role))
      throw new AppError(HttpStatus.FORBIDDEN, 'FORBIDDEN', 'به این بخش دسترسی ندارید.');
    return true;
  }
}

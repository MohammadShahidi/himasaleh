import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { otpRequestSchema, otpVerifySchema, switchRoleSchema } from '@hm/shared';
import type { Response } from 'express';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import { AppError } from '../common/errors.js';
import { type AppRequest, type AuthUser, deviceIdOf, ipOf } from '../common/request.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { UsersService } from '../users/users.service.js';
import { CurrentUser, Public } from './decorators.js';
import { OtpService } from './otp.service.js';
import { REFRESH_COOKIE, TokensService } from './tokens.service.js';

const refreshCookie = (req: AppRequest) => (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];

@Controller('auth')
export class AuthController {
  constructor(
    private readonly otp: OtpService,
    private readonly tokens: TokensService,
    private readonly users: UsersService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  request(@Body(new ZodPipe(otpRequestSchema)) body: z.output<typeof otpRequestSchema>, @Req() req: AppRequest) {
    return this.otp.request(body.phone, ipOf(req), deviceIdOf(req));
  }

  /**
   * Signs in an existing account, or signs up when `signup` is present.
   * Without `signup` and without an account, answers SIGNUP_REQUIRED and keeps the code valid.
   */
  @Public()
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  async verify(
    @Body(new ZodPipe(otpVerifySchema)) body: z.output<typeof otpVerifySchema>,
    @Req() req: AppRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const existing = await this.users.findByPhone(body.phone);
    if (!existing && !body.signup) {
      await this.otp.verify(body.phone, body.code, false);
      throw new AppError(HttpStatus.NOT_FOUND, 'SIGNUP_REQUIRED', 'با این شماره حسابی نیست. ثبت‌نام کنید.');
    }
    if (existing?.status === 'disabled') throw new AppError(HttpStatus.FORBIDDEN, 'ACCOUNT_DISABLED', 'این حساب غیرفعال است.');
    await this.otp.verify(body.phone, body.code, true);

    const user = body.signup ? await this.users.signup(body.phone, body.signup) : existing!;
    const activeRole = body.signup?.role ?? existing!.roles[0]?.role;
    if (!activeRole) throw new AppError(HttpStatus.NOT_FOUND, 'SIGNUP_REQUIRED', 'برای این حساب نقشی ثبت نشده است. ثبت‌نام کنید.');
    await this.tokens.issue(res, user.id, activeRole);
    await this.audit.log({ actorId: user.id, action: body.signup ? 'auth.signup' : 'auth.login', entity: 'user', entityId: user.id, after: { role: activeRole }, ip: ipOf(req) });
    return this.users.sessionUser(user.id, activeRole);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: AppRequest, @Res({ passthrough: true }) res: Response) {
    const { userId, activeRole } = await this.tokens.refresh(res, refreshCookie(req));
    return this.users.sessionUser(userId, activeRole);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: AppRequest, @Res({ passthrough: true }) res: Response) {
    await this.tokens.revoke(res, refreshCookie(req));
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.sessionUser(user.id, user.role);
  }

  /** «تغییر نقش»: one button in every panel for accounts with several roles. */
  @Post('role')
  @HttpCode(HttpStatus.OK)
  async switchRole(
    @Body(new ZodPipe(switchRoleSchema)) body: z.output<typeof switchRoleSchema>,
    @CurrentUser() user: AuthUser,
    @Req() req: AppRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Issue first: it refuses a role the account does not hold, and the old session must survive that.
    await this.tokens.issue(res, user.id, body.role);
    await this.tokens.revokeToken(refreshCookie(req));
    return this.users.sessionUser(user.id, body.role);
  }
}

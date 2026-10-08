import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { AppError } from '../common/errors.js';
import { ENV, type Env } from '../env.js';
import { SmsService, SmsUnavailableError } from '../notifications/sms.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { generateOtp, hashOtp, otpMatches } from './otp-crypto.js';
import { looksLikeBot, phoneWaitSeconds } from './otp-policy.js';

const HOUR = 3600_000;

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly sms: SmsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Issues and sends a code. The response never reveals whether the phone has an account. */
  async request(phone: string, ip: string, deviceId: string | null) {
    const s = await this.settings.getMany([
      'otp.maxPerPhone', 'otp.cooldownMin', 'otp.resendSec', 'otp.maxPerIpPerHour', 'otp.maxPerDevicePerHour',
      'otp.botDistinctPhones', 'otp.botWindowMin', 'otp.botBlockHours', 'otp.ttlSec',
    ] as const);
    const now = new Date();

    await this.assertNotBlocked(phone, ip, deviceId, now);

    const recent = await this.prisma.otpRequestLog.findMany({
      where: { phone }, orderBy: { createdAt: 'desc' }, take: s['otp.maxPerPhone'], select: { createdAt: true },
    });
    const wait = phoneWaitSeconds(recent.map((r) => r.createdAt), now, {
      maxPerPhone: s['otp.maxPerPhone'], cooldownMin: s['otp.cooldownMin'], resendSec: s['otp.resendSec'],
    });
    if (wait > 0) throw tooMany(wait);

    const hourAgo = new Date(now.getTime() - HOUR);
    if ((await this.prisma.otpRequestLog.count({ where: { ip, createdAt: { gte: hourAgo } } })) >= s['otp.maxPerIpPerHour'])
      throw tooMany(3600);
    if (deviceId && (await this.prisma.otpRequestLog.count({ where: { deviceId, createdAt: { gte: hourAgo } } })) >= s['otp.maxPerDevicePerHour'])
      throw tooMany(3600);

    await this.prisma.otpRequestLog.create({ data: { phone, ip, deviceId } });
    await this.detectBot(ip, deviceId, now, s);

    const code = generateOtp();
    await this.prisma.otpCode.create({
      data: { phone, codeHash: hashOtp(this.env.OTP_PEPPER, phone, code), expiresAt: new Date(now.getTime() + s['otp.ttlSec'] * 1000) },
    });
    try {
      await this.sms.sendOtp(phone, code);
    } catch (err) {
      if (err instanceof SmsUnavailableError)
        throw new AppError(HttpStatus.SERVICE_UNAVAILABLE, 'SMS_UNAVAILABLE', 'ارسال پیامک الان ممکن نیست. چند دقیقه دیگر دوباره امتحان کنید.');
      throw err;
    }
    return { resendAfterSec: s['otp.resendSec'], expiresInSec: s['otp.ttlSec'] };
  }

  /**
   * Checks the latest live code. With `consume: false` a correct code stays usable, so a person
   * who tried to sign in without an account can continue to sign-up with the same code.
   */
  async verify(phone: string, code: string, consume: boolean): Promise<void> {
    const maxAttempts = await this.settings.get('otp.maxAttempts');
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.attempts >= maxAttempts)
      throw new AppError(HttpStatus.BAD_REQUEST, 'OTP_EXPIRED', 'کد منقضی شده است. کد جدید بگیرید.');

    if (!otpMatches(this.env.OTP_PEPPER, phone, code, otp.codeHash)) {
      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new AppError(HttpStatus.BAD_REQUEST, 'OTP_WRONG', 'کد تایید اشتباه است.');
    }
    if (consume) await this.prisma.otpCode.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
  }

  private async assertNotBlocked(phone: string, ip: string, deviceId: string | null, now: Date) {
    const block = await this.prisma.block.findFirst({
      where: {
        until: { gt: now },
        OR: [{ scope: 'phone', value: phone }, { scope: 'ip', value: ip }, ...(deviceId ? [{ scope: 'device' as const, value: deviceId }] : [])],
      },
      orderBy: { until: 'desc' },
    });
    if (block) throw tooMany(Math.ceil((block.until.getTime() - now.getTime()) / 1000));
  }

  private async detectBot(
    ip: string, deviceId: string | null, now: Date,
    s: { 'otp.botDistinctPhones': number; 'otp.botWindowMin': number; 'otp.botBlockHours': number },
  ) {
    const since = new Date(now.getTime() - s['otp.botWindowMin'] * 60_000);
    const until = new Date(now.getTime() + s['otp.botBlockHours'] * HOUR);
    const distinct = async (where: object) =>
      (await this.prisma.otpRequestLog.findMany({ where: { ...where, createdAt: { gte: since } }, distinct: ['phone'], select: { phone: true } })).length;

    // Carrier-grade NAT puts many real users behind one mobile IP, so the device signal is preferred;
    // the IP check still catches scripts that do not send a device id.
    if (deviceId && looksLikeBot(await distinct({ deviceId }), { botDistinctPhones: s['otp.botDistinctPhones'] })) {
      await this.prisma.block.create({ data: { scope: 'device', value: deviceId, reason: 'bot', until } });
    } else if (!deviceId && looksLikeBot(await distinct({ ip }), { botDistinctPhones: s['otp.botDistinctPhones'] })) {
      await this.prisma.block.create({ data: { scope: 'ip', value: ip, reason: 'bot', until } });
    }
  }
}

function tooMany(retryAfterSec: number) {
  return new AppError(HttpStatus.TOO_MANY_REQUESTS, 'OTP_RATE_LIMIT', 'درخواست زیاد بود. کمی صبر کنید و دوباره امتحان کنید.', {
    retryAfterSec,
  });
}

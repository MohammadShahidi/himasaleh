import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, NotFoundException, Post, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, Public, Roles } from '../auth/decorators.js';
import { AppError } from '../common/errors.js';
import type { AuthUser } from '../common/request.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { ENV, type Env } from '../env.js';
import { KycService } from '../kyc/kyc.service.js';
import { SmsService } from '../notifications/sms.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SETTING_DEFAULTS, type SettingKey } from '../settings/defaults.js';
import { SettingsService } from '../settings/settings.service.js';

/** The only settings the test console may touch: each one exists to make a scenario testable without waiting hours. */
const TUNABLE = [
  'dispatch.offerTtlMin', 'notify.newLoadSms.mode', 'notify.smsFallbackAfterSec', 'kyc.ownerVideoReminderHours', 'fee.driver.defaultBp',
  'otp.maxPerPhone', 'otp.resendSec', 'otp.botDistinctPhones', 'otp.maxPerDevicePerHour', 'otp.maxPerIpPerHour',
  'app.android.minVersionCode', 'app.android.latestVersionCode', 'app.android.storeUrl',
] as const satisfies readonly SettingKey[];

const settingBody = z.object({ key: z.enum(TUNABLE), value: z.union([z.number(), z.string()]).optional() });
const driverStatusBody = z.object({ driverId: z.string().min(1), status: z.enum(['approved', 'blocked']) });
const phoneQuery = z.object({ phone: z.string().regex(/^09\d{9}$/) });

const str = (v: bigint) => v.toString();

/** Public: lets a tester read the sign-in code of a *test number* (SMS_TEST_PREFIX) without a real phone. 404 unless dev tools are on. */
@Controller('dev')
export class DevPublicController {
  constructor(
    private readonly sms: SmsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Public()
  @Get('test-sms')
  messages(@Query(new ZodPipe(phoneQuery)) q: z.output<typeof phoneQuery>) {
    if (!this.env.ENABLE_DEV_TOOLS || !this.env.SMS_TEST_PREFIX || !this.sms.isTestNumber(q.phone)) throw new NotFoundException();
    return { prefix: this.env.SMS_TEST_PREFIX, messages: this.sms.testMessages(q.phone, 15) };
  }
}

/**
 * Test console for staff on dev and acceptance servers (ENABLE_DEV_TOOLS): everything a tester would otherwise do with SQL.
 * Answers 404 when the flag is off, so on a normal production server none of this exists.
 */
@Controller('dev')
@Roles('staff')
export class DevConsoleController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly kyc: KycService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private guard() {
    if (!this.env.ENABLE_DEV_TOOLS) throw new NotFoundException();
  }

  /** One snapshot of what a tester needs to see. */
  @Get('state')
  async state() {
    this.guard();
    const [drivers, sms, notifications, audit, balances, overrides, trips, ledgerSum, ledgerKinds] = await Promise.all([
      this.prisma.driverProfile.findMany({ orderBy: { createdAt: 'desc' }, take: 40, include: { user: { select: { phone: true } } } }),
      this.prisma.smsMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 15 }),
      this.prisma.notificationLog.findMany({ orderBy: { createdAt: 'desc' }, take: 15 }),
      this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 15 }),
      this.prisma.accountBalance.findMany({ orderBy: { account: 'asc' }, take: 60 }),
      this.prisma.setting.findMany({ orderBy: { key: 'asc' } }),
      this.prisma.trip.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { events: { orderBy: { step: 'asc' } } } }),
      this.prisma.ledgerEntry.aggregate({ _sum: { amountRial: true } }),
      this.prisma.ledgerTxn.groupBy({ by: ['kind'], _count: true }),
    ]);
    return {
      flags: {
        smsTestPrefix: this.env.SMS_TEST_PREFIX ?? null, smsProvider: this.env.SMS_PRIMARY_PROVIDER, pushProvider: this.env.PUSH_PROVIDER,
        shahkarProvider: this.env.SHAHKAR_PROVIDER, nodeEnv: this.env.NODE_ENV,
      },
      tunable: TUNABLE.map((k) => ({ key: k, default: SETTING_DEFAULTS[k] as unknown })),
      overrides: overrides.map((o) => ({ key: o.key, value: o.value })),
      drivers: drivers.map((d) => ({ id: d.id, name: `${d.firstName} ${d.lastName}`, nationalId: d.nationalId, phone: d.user.phone, status: d.status, online: d.online, city: d.city })),
      trips: trips.map((t) => ({ id: t.id, status: t.status, step: t.step, waybillNo: t.waybillNo, isTest: t.isTest, events: t.events.map((e) => ({ step: e.step, clientAt: e.clientAt, serverAt: e.serverAt, photo: !!e.photoFileId })) })),
      sms: sms.map((m) => ({ at: m.createdAt, to: m.to, kind: m.kind, provider: m.provider, status: m.status, text: m.text.slice(0, 140), error: m.error })),
      notifications: notifications.map((n) => ({ at: n.createdAt, type: n.type, channel: n.channel, status: n.status, error: n.error, acked: !!n.ackedAt })),
      audit: audit.map((a) => ({ at: a.createdAt, action: a.action, entity: a.entity })),
      ledger: { sumRial: str(ledgerSum._sum.amountRial ?? 0n), balances: balances.map((b) => ({ account: b.account, rial: str(b.balanceRial) })), kinds: ledgerKinds.map((k) => ({ kind: k.kind, count: k._count })) },
    };
  }

  @Put('settings')
  async setSetting(@Body(new ZodPipe(settingBody)) body: z.output<typeof settingBody>, @CurrentUser() user: AuthUser) {
    this.guard();
    if (body.value === undefined) {
      await this.settings.reset(body.key, user.id);
      return { key: body.key, value: SETTING_DEFAULTS[body.key] as unknown, reset: true };
    }
    const def = SETTING_DEFAULTS[body.key] as unknown;
    if (typeof def !== typeof body.value) throw new AppError(HttpStatus.BAD_REQUEST, 'BAD_VALUE', `مقدار باید ${typeof def === 'number' ? 'عدد' : 'متن'} باشد.`);
    if (body.key === 'notify.newLoadSms.mode' && !['off', 'fallback', 'always'].includes(String(body.value))) throw new AppError(HttpStatus.BAD_REQUEST, 'BAD_VALUE', 'فقط off، fallback یا always.');
    await this.settings.set(body.key, body.value as never, user.id);
    return { key: body.key, value: body.value };
  }

  /** Makes every open offer expire now. */
  @Post('expire-offers')
  @HttpCode(HttpStatus.OK)
  async expireOffers() {
    this.guard();
    const r = await this.prisma.dispatchOffer.updateMany({ where: { status: 'pending' }, data: { expiresAt: new Date(Date.now() - 60_000) } });
    return { count: r.count };
  }

  /** Cancels every trip in progress (to see how the phone reacts, e.g. a queued step arriving for a cancelled trip). */
  @Post('cancel-trips')
  @HttpCode(HttpStatus.OK)
  async cancelTrips() {
    this.guard();
    const r = await this.prisma.trip.updateMany({ where: { status: { in: ['assigned', 'loading', 'in_transit', 'arrived'] } }, data: { status: 'cancelled' } });
    return { count: r.count };
  }

  @Post('driver-status')
  @HttpCode(HttpStatus.OK)
  async driverStatus(@Body(new ZodPipe(driverStatusBody)) body: z.output<typeof driverStatusBody>) {
    this.guard();
    await this.prisma.driverProfile.update({ where: { id: body.driverId }, data: { status: body.status, ...(body.status === 'blocked' ? { online: false } : {}) } });
    return { ok: true };
  }

  /** Runs the 24-hour owner-video reminder now (it normally runs every 30 minutes). */
  @Post('run-reminders')
  @HttpCode(HttpStatus.OK)
  async runReminders() {
    this.guard();
    return { sent: await this.kyc.remindOwnerVideos() };
  }

  /** Forgets sign-in rate limits and blocks, so a tester using many numbers is not locked out. */
  @Post('clear-otp-limits')
  @HttpCode(HttpStatus.OK)
  async clearOtpLimits() {
    this.guard();
    const [a, b, c] = await Promise.all([this.prisma.otpRequestLog.deleteMany({}), this.prisma.block.deleteMany({}), this.prisma.otpCode.deleteMany({})]);
    return { logs: a.count, blocks: b.count, codes: c.count };
  }

  /**
   * Deletes everything created by test numbers (SMS_TEST_PREFIX): their accounts (and so registrations, documents, offers, devices,
   * notifications), test trips, their SMS rows and sign-in rows. Staff accounts and the ledger are kept (the ledger is append-only).
   */
  @Delete('test-data')
  async resetTestData() {
    this.guard();
    const prefix = this.env.SMS_TEST_PREFIX;
    if (!prefix) throw new AppError(HttpStatus.CONFLICT, 'NO_PREFIX', 'SMS_TEST_PREFIX تنظیم نشده است.');
    const users = await this.prisma.user.findMany({ where: { phone: { startsWith: prefix }, roles: { none: { role: 'staff' } } }, select: { id: true } });
    const ids = users.map((u) => u.id);
    const drivers = await this.prisma.driverProfile.findMany({ where: { userId: { in: ids } }, select: { id: true } });
    const kyc = await this.prisma.kycItem.findMany({
      where: { OR: [{ driverId: { in: drivers.map((d) => d.id) } }, { owner: { vehicle: { driverId: { in: drivers.map((d) => d.id) } } } }] }, select: { fileId: true },
    });
    const fileIds = [...new Set(kyc.map((k) => k.fileId))];
    await this.prisma.trip.deleteMany({ where: { OR: [{ isTest: true }, { driverId: { in: drivers.map((d) => d.id) } }] } });
    await this.prisma.user.deleteMany({ where: { id: { in: ids } } });
    await this.prisma.fileObject.deleteMany({ where: { id: { in: fileIds } } });
    await this.prisma.fileObject.deleteMany({ where: { ownerId: { in: ids } } });
    await this.prisma.smsMessage.deleteMany({ where: { to: { startsWith: prefix } } });
    await this.prisma.otpRequestLog.deleteMany({ where: { phone: { startsWith: prefix } } });
    return { users: ids.length, files: fileIds.length };
  }
}

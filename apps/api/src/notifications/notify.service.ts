import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { JobsService } from '../jobs/jobs.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import type { PushProvider } from './push.provider.js';
import type { SmsTemplateKey } from './sms-templates.js';
import { SmsService } from './sms.service.js';

export const PUSH_PROVIDER = Symbol('PUSH_PROVIDER');

const FALLBACK_QUEUE = 'notify.smsFallback';

/** When the SMS goes: `newLoad` follows the admin setting `notify.newLoadSms.mode`. */
export type SmsMode = 'always' | 'fallback' | 'off' | 'newLoad';

export interface NotifyEvent {
  type: string;
  title: string;
  body: string;
  /** deep link opened by tapping the notification */
  path?: string;
  /** `loads` rings loudly with high priority; default `general` */
  channel?: 'loads' | 'general';
  sms?: { template: SmsTemplateKey; params: Record<string, string>; mode: SmsMode };
}

interface FallbackJob {
  logId: string;
  userId: string;
  template: SmsTemplateKey;
  params: Record<string, string>;
}

/**
 * Tells a user something: push to their app first, SMS according to the event's mode (ARCHITECTURE §4.7).
 * `fallback` sends the SMS at once when there is no app/push, otherwise after `notify.smsFallbackAfterSec`
 * unless the app confirmed the push by then.
 */
@Injectable()
export class NotifyService implements OnModuleInit {
  private readonly logger = new Logger(NotifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly sms: SmsService,
    private readonly jobs: JobsService,
    @Inject(PUSH_PROVIDER) private readonly push: PushProvider,
  ) {}

  async onModuleInit() {
    await this.jobs.onQueue<FallbackJob>(FALLBACK_QUEUE, (d) => this.runFallback(d));
  }

  async registerDevice(userId: string, token: string, appVersion?: string) {
    await this.prisma.device.upsert({
      where: { token },
      create: { userId, token, appVersion: appVersion ?? null },
      update: { userId, appVersion: appVersion ?? null, lastSeenAt: new Date() },
    });
  }

  async unregisterDevice(userId: string, token: string) {
    await this.prisma.device.deleteMany({ where: { userId, token } });
  }

  /** The app confirms that the push arrived (so no fallback SMS is needed). */
  async ack(userId: string, id: string) {
    await this.prisma.notificationLog.updateMany({ where: { id, userId, ackedAt: null }, data: { ackedAt: new Date(), status: 'acked' } });
  }

  async notify(userId: string, ev: NotifyEvent) {
    const devices = await this.prisma.device.findMany({ where: { userId } });
    const log = await this.prisma.notificationLog.create({
      data: { userId, type: ev.type, channel: 'push', status: 'sent', title: ev.title, path: ev.path ?? null },
    });

    let delivered = 0;
    const errors: string[] = [];
    for (const d of devices) {
      try {
        const r = await this.push.send(d.token, {
          title: ev.title, body: ev.body, notificationId: log.id, channel: ev.channel ?? 'general', ...(ev.path ? { path: ev.path } : {}),
        });
        if (r.invalidToken) await this.prisma.device.delete({ where: { id: d.id } }).catch(() => undefined);
        else delivered++;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
    if (delivered === 0) {
      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: 'failed', error: (devices.length ? errors.join(' | ') || 'invalid token' : 'no device').slice(0, 500) },
      });
    }

    if (ev.sms) {
      const mode = ev.sms.mode === 'newLoad' ? await this.settings.get('notify.newLoadSms.mode') : ev.sms.mode;
      const job: FallbackJob = { logId: log.id, userId, template: ev.sms.template, params: ev.sms.params };
      if (mode === 'always' || (mode === 'fallback' && delivered === 0)) await this.sendSms(job);
      else if (mode === 'fallback') await this.jobs.later(FALLBACK_QUEUE, job, await this.settings.get('notify.smsFallbackAfterSec'));
    }
    return { id: log.id, delivered };
  }

  private async runFallback(job: FallbackJob) {
    const log = await this.prisma.notificationLog.findUnique({ where: { id: job.logId } });
    if (!log || log.ackedAt) return;
    await this.sendSms(job);
  }

  private async sendSms(job: FallbackJob) {
    const user = await this.prisma.user.findUnique({ where: { id: job.userId }, select: { phone: true } });
    if (!user) return;
    await this.sms.notifySafely(user.phone, job.template, job.params as never);
    await this.prisma.notificationLog.create({ data: { userId: job.userId, type: job.template, channel: 'sms', status: 'sent' } });
    this.logger.debug(`SMS ${job.template} sent for notification ${job.logId}`);
  }
}

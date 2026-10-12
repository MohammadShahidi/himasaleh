import { Inject, Injectable, Logger } from '@nestjs/common';
import { ENV, type Env } from '../env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SmsTemplateKey, SmsTemplateParams } from './sms-templates.js';
import type { SmsProvider, SmsReceipt } from './sms.provider.js';
import { TestSmsProvider } from './test-sms.provider.js';

export const SMS_PROVIDERS = Symbol('SMS_PROVIDERS');

export class SmsUnavailableError extends Error {}

/**
 * Sends through the primary provider and falls back to the backup one (process doc §9).
 * OTP codes are masked before the message is logged to the database.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly testProvider = new TestSmsProvider();

  constructor(
    @Inject(SMS_PROVIDERS) private readonly providers: SmsProvider[],
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  /** True for a test number while the dev tools are on (see SMS_TEST_PREFIX). */
  isTestNumber(to: string): boolean {
    return !!this.env.ENABLE_DEV_TOOLS && !!this.env.SMS_TEST_PREFIX && to.startsWith(this.env.SMS_TEST_PREFIX);
  }

  /** Messages "sent" to test numbers, newest first. Empty for anything that is not a test number. */
  testMessages(phone?: string, limit = 20) {
    if (phone && !this.isTestNumber(phone)) return [];
    return this.testProvider.recent(phone, limit);
  }

  otpText(code: string): string {
    // The last line lets Android Chrome fill the code automatically (WebOTP).
    return `کد ورود ${this.env.BRAND_NAME}: ${code}\nاین کد را به کسی ندهید.\n\n@${this.env.APP_DOMAIN} #${code}`;
  }

  async sendOtp(to: string, code: string) {
    const text = this.otpText(code);
    await this.deliver(to, 'otp', text.replaceAll(code, '•••••'), (p) => p.sendOtp(to, code, text));
  }

  /**
   * Sends an approved template. Parameter values are trimmed to the provider's 25-character limit.
   * Callers that must not fail because of a text message use `notifySafely`.
   */
  async sendTemplate<K extends SmsTemplateKey>(to: string, key: K, params: SmsTemplateParams<K>) {
    const clean = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v).slice(0, 25)]));
    await this.deliver(to, key, `${key} ${JSON.stringify(clean)}`, (p) => p.sendTemplate(to, key, clean));
  }

  /** Like `sendTemplate`, but a failure is logged and swallowed (the SMS row already records it). */
  async notifySafely<K extends SmsTemplateKey>(to: string, key: K, params: SmsTemplateParams<K>) {
    try {
      await this.sendTemplate(to, key, params);
    } catch (err) {
      this.logger.error(`notification ${key} to ${to} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async send(to: string, kind: string, text: string) {
    await this.deliver(to, kind, text, (p) => p.send(to, text));
  }

  private async deliver(to: string, kind: string, loggedText: string, op: (p: SmsProvider) => Promise<SmsReceipt>) {
    const errors: string[] = [];
    for (const p of this.isTestNumber(to) ? [this.testProvider] : this.providers) {
      try {
        const r = await op(p);
        await this.prisma.smsMessage.create({
          data: { provider: p.name, to, kind, text: loggedText, status: 'sent', providerRef: r.ref ?? null, cost: r.cost ?? null },
        });
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${p.name}: ${msg}`);
        this.logger.error(`SMS via ${p.name} failed: ${msg}`);
        await this.prisma.smsMessage.create({
          data: { provider: p.name, to, kind, text: loggedText, status: 'failed', error: msg.slice(0, 500) },
        });
      }
    }
    // Both providers down: nobody can sign in. Surface it loudly.
    this.logger.fatal(`All SMS providers failed for ${kind}: ${errors.join(' | ')}`);
    throw new SmsUnavailableError(errors.join(' | '));
  }
}

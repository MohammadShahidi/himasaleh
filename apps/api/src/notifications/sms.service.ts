import { Inject, Injectable, Logger } from '@nestjs/common';
import { ENV, type Env } from '../env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SmsProvider } from './sms.provider.js';

export const SMS_PROVIDERS = Symbol('SMS_PROVIDERS');

export class SmsUnavailableError extends Error {}

/**
 * Sends through the primary provider and falls back to the backup one (process doc §9).
 * OTP codes are masked before the message is logged to the database.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(
    @Inject(SMS_PROVIDERS) private readonly providers: SmsProvider[],
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {}

  otpText(code: string): string {
    // The last line lets Android Chrome fill the code automatically (WebOTP).
    return `کد ورود ${this.env.BRAND_NAME}: ${code}\nاین کد را به کسی ندهید.\n\n@${this.env.APP_DOMAIN} #${code}`;
  }

  async sendOtp(to: string, code: string) {
    const text = this.otpText(code);
    await this.deliver(to, 'otp', text.replaceAll(code, '•••••'), (p) => p.sendOtp(to, code, text));
  }

  async send(to: string, kind: string, text: string) {
    await this.deliver(to, kind, text, (p) => p.send(to, text));
  }

  private async deliver(to: string, kind: string, loggedText: string, op: (p: SmsProvider) => Promise<void>) {
    const errors: string[] = [];
    for (const p of this.providers) {
      try {
        await op(p);
        await this.prisma.smsMessage.create({ data: { provider: p.name, to, kind, text: loggedText, status: 'sent' } });
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

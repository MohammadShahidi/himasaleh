import { Logger } from '@nestjs/common';

/** What a provider reports back for one sent message. */
export interface SmsReceipt {
  /** The provider's id for the message, for support tickets and delivery checks. */
  ref?: string;
  /** Credit the provider charged, as reported by it. */
  cost?: string;
}

/** One implementation per SMS company. */
export interface SmsProvider {
  readonly name: string;
  /** Sends the OTP through the provider's approved template (pattern). */
  sendOtp(to: string, code: string, text: string): Promise<SmsReceipt>;
  send(to: string, text: string): Promise<SmsReceipt>;
}

/** Development provider: writes the message to the log instead of sending it. */
export class FakeSmsProvider implements SmsProvider {
  private readonly logger = new Logger('FakeSms');
  constructor(readonly name = 'fake') {}

  async sendOtp(to: string, _code: string, text: string) {
    this.logger.log(`[${this.name}] OTP → ${to}: ${text}`);
    return {};
  }

  async send(to: string, text: string) {
    this.logger.log(`[${this.name}] → ${to}: ${text}`);
    return {};
  }
}

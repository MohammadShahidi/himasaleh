import { Logger } from '@nestjs/common';

/** One implementation per SMS company. Real providers are added when their API docs arrive. */
export interface SmsProvider {
  readonly name: string;
  /** Sends the OTP through the provider's approved template (pattern). */
  sendOtp(to: string, code: string, text: string): Promise<void>;
  send(to: string, text: string): Promise<void>;
}

/** Development provider: writes the message to the log instead of sending it. */
export class FakeSmsProvider implements SmsProvider {
  private readonly logger = new Logger('FakeSms');
  constructor(readonly name = 'fake') {}

  async sendOtp(to: string, _code: string, text: string) {
    this.logger.log(`[${this.name}] OTP → ${to}: ${text}`);
  }

  async send(to: string, text: string) {
    this.logger.log(`[${this.name}] → ${to}: ${text}`);
  }
}

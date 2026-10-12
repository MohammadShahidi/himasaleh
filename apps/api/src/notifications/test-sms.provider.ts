import { Logger } from '@nestjs/common';
import type { SmsTemplateKey } from './sms-templates.js';
import type { SmsProvider, SmsReceipt } from './sms.provider.js';

export interface TestSms {
  at: string;
  to: string;
  /** `otp`, or the template key for templated messages, or `text` */
  kind: string;
  text: string;
  /** the plain one-time code, for `otp` only */
  code?: string;
}

const KEEP = 300;

/**
 * Receives every SMS addressed to a *test number* (SMS_TEST_PREFIX) when the dev tools are on, instead of the real provider.
 * Nothing is sent to the network; the messages are kept in memory so a tester can read the sign-in code and the other
 * messages on a test server without a real phone (GET /dev/test-sms). Lost on restart, which is fine.
 */
export class TestSmsProvider implements SmsProvider {
  readonly name = 'test';
  private readonly logger = new Logger('TestSms');
  private buf: TestSms[] = [];

  private push(m: TestSms): SmsReceipt {
    this.buf.push(m);
    if (this.buf.length > KEEP) this.buf = this.buf.slice(-KEEP);
    this.logger.log(`[test] ${m.kind} → ${m.to}`);
    return {};
  }

  async sendOtp(to: string, code: string, text: string) {
    return this.push({ at: new Date().toISOString(), to, kind: 'otp', text, code });
  }

  async send(to: string, text: string) {
    return this.push({ at: new Date().toISOString(), to, kind: 'text', text });
  }

  async sendTemplate(to: string, key: SmsTemplateKey, params: Record<string, string>) {
    return this.push({ at: new Date().toISOString(), to, kind: key, text: `${key} ${JSON.stringify(params)}` });
  }

  /** Newest first; for one phone, or all test numbers. */
  recent(phone?: string, limit = 20): TestSms[] {
    return this.buf.filter((m) => !phone || m.to === phone).slice(-limit).reverse();
  }
}

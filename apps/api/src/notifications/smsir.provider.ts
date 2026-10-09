import type { SmsProvider, SmsReceipt } from './sms.provider.js';

export interface SmsIrConfig {
  apiKey: string;
  /** Template («قالب») defined in the sms.ir panel under «ارسال سریع». */
  otpTemplateId: number;
  /** The template's placeholder name, without the surrounding #. */
  otpParam: string;
  baseUrl?: string;
  timeoutMs?: number;
}

/** sms.ir answers 200 with `status !== 1` for business errors (bad template, no credit, ...). */
export class SmsIrError extends Error {}

/**
 * sms.ir «ارسال VERIFY»: POST /v1/send/verify with a template id and its parameters.
 * Verify messages go out on service lines, so they reach people who blocked advertising SMS.
 */
export class SmsIrProvider implements SmsProvider {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    readonly name: string,
    private readonly cfg: SmsIrConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.baseUrl = (cfg.baseUrl ?? 'https://api.sms.ir').replace(/\/$/, '');
    this.timeoutMs = cfg.timeoutMs ?? 10_000;
  }

  sendOtp(to: string, code: string): Promise<SmsReceipt> {
    return this.verify(to, this.cfg.otpTemplateId, { [this.cfg.otpParam]: code });
  }

  /**
   * Free-text sending is a different sms.ir method that has not been wired up yet; every message
   * in later phases goes through its own approved template via `verify`.
   */
  async send(): Promise<SmsReceipt> {
    throw new SmsIrError('free-text sending is not configured for sms.ir');
  }

  async verify(to: string, templateId: number, params: Record<string, string>): Promise<SmsReceipt> {
    for (const [k, v] of Object.entries(params))
      if (v.length > 25) throw new SmsIrError(`parameter ${k} exceeds 25 characters`);

    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}/v1/send/verify`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json', 'x-api-key': this.cfg.apiKey },
        body: JSON.stringify({
          // The documented examples send the number without its leading 0 (9120000000).
          mobile: to.replace(/^0/, ''),
          templateId,
          parameters: Object.entries(params).map(([name, value]) => ({ name, value })),
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new SmsIrError(`request failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    const body = (await res.json().catch(() => null)) as
      | { status?: number; message?: string; data?: { messageId?: number; cost?: number } }
      | null;
    if (!res.ok || body?.status !== 1)
      throw new SmsIrError(`HTTP ${res.status}, status ${body?.status ?? '-'}: ${body?.message ?? 'no message'}`);

    return {
      ...(body.data?.messageId !== undefined ? { ref: String(body.data.messageId) } : {}),
      ...(body.data?.cost !== undefined ? { cost: String(body.data.cost) } : {}),
    };
  }
}

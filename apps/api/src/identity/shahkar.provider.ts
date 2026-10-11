import { randomUUID } from 'node:crypto';

export class ShahkarError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

/** Checks that a national ID and a mobile number belong to the same person. One implementation per provider. */
export interface ShahkarProvider {
  readonly name: string;
  match(nationalId: string, mobile: string): Promise<boolean>;
}

/**
 * Jibit identity API, «Match national code with mobile number» (backed by Shahkar):
 * GET https://napi.jibit.ir/ide/v1/services/matching?nationalCode=…&mobileNumber=…, header Authorization,
 * optional X-TRACK-ID; 200 { matched: boolean }. When every provider behind it fails, the API answers
 * `handler.too_many_requests`. See docs/INTEGRATIONS.md.
 */
export class JibitShahkarProvider implements ShahkarProvider {
  readonly name = 'jibit';

  constructor(
    private readonly authorization: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly baseUrl = 'https://napi.jibit.ir/ide',
    private readonly timeoutMs = 15_000,
  ) {}

  async match(nationalId: string, mobile: string): Promise<boolean> {
    const url = `${this.baseUrl}/v1/services/matching?${new URLSearchParams({ nationalCode: nationalId, mobileNumber: mobile })}`;
    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        headers: { accept: 'application/json', authorization: this.authorization, 'x-track-id': randomUUID() },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new ShahkarError(`request failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    const body = (await res.json().catch(() => null)) as { matched?: boolean; code?: string; message?: string } | null;
    if (!res.ok) {
      throw new ShahkarError(`HTTP ${res.status}${body?.code ? ` ${body.code}` : ''}${body?.message ? `: ${body.message}` : ''}`, res.status, body?.code);
    }
    if (typeof body?.matched !== 'boolean') throw new ShahkarError('unexpected response (no "matched")');
    return body.matched;
  }
}

import { createSign } from 'node:crypto';
import type { PushMessage, PushProvider, PushResult } from './push.provider.js';

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export class FcmError extends Error {}

const b64 = (v: unknown) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');

/**
 * Firebase Cloud Messaging HTTP v1, with the OAuth token minted from the service account (no SDK).
 * The service-account JSON stays on the server (env FCM_SERVICE_ACCOUNT_JSON), never in the app.
 */
export class FcmPushProvider implements PushProvider {
  readonly name = 'fcm';
  private readonly account: ServiceAccount;
  private cached: { token: string; exp: number } | null = null;

  constructor(
    serviceAccountJson: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly timeoutMs = 10_000,
  ) {
    try {
      this.account = JSON.parse(serviceAccountJson) as ServiceAccount;
    } catch {
      throw new FcmError('FCM_SERVICE_ACCOUNT_JSON is not valid JSON');
    }
    if (!this.account.project_id || !this.account.client_email || !this.account.private_key) throw new FcmError('FCM service account is incomplete');
  }

  private async accessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.cached && this.cached.exp - 60 > now) return this.cached.token;
    const uri = this.account.token_uri ?? 'https://oauth2.googleapis.com/token';
    const head = b64({ alg: 'RS256', typ: 'JWT' });
    const claims = b64({ iss: this.account.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: uri, iat: now, exp: now + 3600 });
    const sig = createSign('RSA-SHA256').update(`${head}.${claims}`).sign(this.account.private_key).toString('base64url');
    const res = await this.fetchImpl(uri, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claims}.${sig}` }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const body = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;
    if (!res.ok || !body?.access_token) throw new FcmError(`could not get an FCM access token (HTTP ${res.status})`);
    this.cached = { token: body.access_token, exp: now + (body.expires_in ?? 3600) };
    return body.access_token;
  }

  async send(token: string, msg: PushMessage): Promise<PushResult> {
    const access = await this.accessToken();
    let res: Response;
    try {
      res = await this.fetchImpl(`https://fcm.googleapis.com/v1/projects/${this.account.project_id}/messages:send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${access}` },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: msg.title, body: msg.body },
            data: { notificationId: msg.notificationId, ...(msg.path ? { path: msg.path } : {}), channel: msg.channel },
            android: { priority: msg.channel === 'loads' ? 'HIGH' : 'NORMAL', notification: { channel_id: msg.channel } },
          },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new FcmError(`request failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    const body = (await res.json().catch(() => null)) as { name?: string; error?: { status?: string; message?: string } } | null;
    if (res.ok) return { ...(body?.name ? { ref: body.name } : {}) };
    // The token is dead for good (app uninstalled, token rotated).
    if (res.status === 404 || body?.error?.status === 'NOT_FOUND' || body?.error?.status === 'UNREGISTERED') return { invalidToken: true };
    throw new FcmError(`HTTP ${res.status}: ${body?.error?.status ?? ''} ${body?.error?.message ?? ''}`.trim());
  }
}

import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { FcmError, FcmPushProvider } from './fcm.provider.js';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const account = JSON.stringify({ project_id: 'himasaleh-test', client_email: 'push@himasaleh-test.iam.gserviceaccount.com', private_key: privateKey });
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const msg = { title: 'بار جدید', body: 'کرج', notificationId: 'n1', channel: 'loads' as const, path: '/driver/offers/1' };

describe('FcmPushProvider', () => {
  it('gets an access token once, then sends a high-priority message on the loud channel', async () => {
    const fetchImpl = vi.fn(async (url: string) => (url.includes('oauth2') ? json(200, { access_token: 'AT', expires_in: 3600 }) : json(200, { name: 'projects/x/messages/1' })));
    const p = new FcmPushProvider(account, fetchImpl as unknown as typeof fetch);
    await expect(p.send('tok', msg)).resolves.toEqual({ ref: 'projects/x/messages/1' });
    await p.send('tok', msg);
    expect(fetchImpl.mock.calls.filter(([u]) => String(u).includes('oauth2'))).toHaveLength(1);
    const [url, init] = fetchImpl.mock.calls.find(([u]) => String(u).includes('fcm.googleapis.com'))! as unknown as [string, { body: string; headers: Record<string, string> }];
    expect(url).toContain('/projects/himasaleh-test/messages:send');
    expect(init.headers['authorization']).toBe('Bearer AT');
    const body = JSON.parse(init.body) as { message: { android: { priority: string; notification: { channel_id: string } }; data: Record<string, string> } };
    expect(body.message.android).toEqual({ priority: 'HIGH', notification: { channel_id: 'loads' } });
    expect(body.message.data).toMatchObject({ notificationId: 'n1', path: '/driver/offers/1' });
  });

  it('reports a dead token instead of throwing', async () => {
    const fetchImpl = vi.fn(async (url: string) => (url.includes('oauth2') ? json(200, { access_token: 'AT' }) : json(404, { error: { status: 'NOT_FOUND' } })));
    const p = new FcmPushProvider(account, fetchImpl as unknown as typeof fetch);
    await expect(p.send('tok', msg)).resolves.toEqual({ invalidToken: true });
  });

  it('throws on other errors and on a bad service account', async () => {
    const fetchImpl = vi.fn(async (url: string) => (url.includes('oauth2') ? json(200, { access_token: 'AT' }) : json(500, { error: { status: 'INTERNAL' } })));
    await expect(new FcmPushProvider(account, fetchImpl as unknown as typeof fetch).send('tok', msg)).rejects.toBeInstanceOf(FcmError);
    expect(() => new FcmPushProvider('not json')).toThrow(FcmError);
    expect(() => new FcmPushProvider('{}')).toThrow(/incomplete/);
  });
});

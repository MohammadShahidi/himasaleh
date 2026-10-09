import { describe, expect, it, vi } from 'vitest';
import { SmsIrError, SmsIrProvider } from './smsir.provider.js';

const cfg = { apiKey: 'test-key', otpTemplateId: 123456, otpParam: 'Code' };
const reply = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

describe('SmsIrProvider', () => {
  it('sends the documented verify request and returns the receipt', async () => {
    const f = reply(200, { status: 1, message: 'موفق', data: { messageId: 89545112, cost: 1 } });
    const p = new SmsIrProvider('primary', cfg, f as unknown as typeof fetch);
    await expect(p.sendOtp('09123456789', '01234')).resolves.toEqual({ ref: '89545112', cost: '1' });

    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.sms.ir/v1/send/verify');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('test-key');
    expect(JSON.parse(String(init.body))).toEqual({
      mobile: '9123456789', templateId: 123456, parameters: [{ name: 'Code', value: '01234' }],
    });
  });

  it('treats status other than 1 as failure, even on HTTP 200', async () => {
    const p = new SmsIrProvider('primary', cfg, reply(200, { status: 0, message: 'اعتبار کافی نیست' }) as unknown as typeof fetch);
    await expect(p.sendOtp('09123456789', '01234')).rejects.toThrow(/اعتبار کافی نیست/);
  });

  it('fails on HTTP errors and network errors', async () => {
    const p1 = new SmsIrProvider('primary', cfg, reply(401, { status: 0, message: 'unauthorized' }) as unknown as typeof fetch);
    await expect(p1.sendOtp('09123456789', '01234')).rejects.toBeInstanceOf(SmsIrError);
    const p2 = new SmsIrProvider('primary', cfg, vi.fn(async () => { throw new TypeError('fetch failed'); }) as unknown as typeof fetch);
    await expect(p2.sendOtp('09123456789', '01234')).rejects.toThrow(/request failed/);
  });

  it('rejects parameter values over 25 characters before calling the API', async () => {
    const f = reply(200, { status: 1 });
    const p = new SmsIrProvider('primary', cfg, f as unknown as typeof fetch);
    await expect(p.verify('09123456789', 1, { Name: 'x'.repeat(26) })).rejects.toThrow(/25/);
    expect(f).not.toHaveBeenCalled();
  });
});

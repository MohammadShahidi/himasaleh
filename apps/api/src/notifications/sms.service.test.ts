import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../env.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { SmsProvider } from './sms.provider.js';
import { SmsService, SmsUnavailableError } from './sms.service.js';

const env = { BRAND_NAME: 'های مصالح', APP_DOMAIN: 'example.ir' } as Env;

function setup(primaryFails: boolean, backup?: Partial<SmsProvider>) {
  const rows: { provider: string; status: string; text: string; providerRef?: string | null }[] = [];
  const prisma = { smsMessage: { create: vi.fn(async ({ data }) => rows.push(data)) } } as unknown as PrismaService;
  const primary: SmsProvider = {
    name: 'primary',
    sendOtp: vi.fn(async () => { if (primaryFails) throw new Error('down'); return { ref: '89545112', cost: '1' }; }),
    send: vi.fn(async () => ({})),
  };
  const providers = [primary, ...(backup ? [{ name: 'backup', sendOtp: vi.fn(async () => ({})), send: vi.fn(async () => ({})), ...backup } as SmsProvider] : [])];
  return { svc: new SmsService(providers, env, prisma), rows, primary, providers };
}

describe('SmsService', () => {
  it('puts the WebOTP line last and masks the code in the log', async () => {
    const { svc, rows } = setup(false);
    expect(svc.otpText('12345').split('\n').at(-1)).toBe('@example.ir #12345');
    await svc.sendOtp('09123456789', '12345');
    expect(rows[0]).toMatchObject({ provider: 'primary', status: 'sent', providerRef: '89545112', cost: '1' });
    expect(rows[0]!.text).not.toContain('12345');
  });

  it('falls back to the backup provider', async () => {
    const { svc, rows, providers } = setup(true, {});
    await svc.sendOtp('09123456789', '12345');
    expect(providers[1]!.sendOtp).toHaveBeenCalledOnce();
    expect(rows.map((r) => `${r.provider}:${r.status}`)).toEqual(['primary:failed', 'backup:sent']);
  });

  it('throws when every provider fails', async () => {
    const { svc } = setup(true, { sendOtp: vi.fn(async () => { throw new Error('also down'); }) });
    await expect(svc.sendOtp('09123456789', '12345')).rejects.toBeInstanceOf(SmsUnavailableError);
  });
});

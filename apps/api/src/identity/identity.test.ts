import { describe, expect, it, vi } from 'vitest';
import { IdentityService } from './identity.service.js';
import { JibitShahkarProvider, ShahkarError, type ShahkarProvider } from './shahkar.provider.js';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('JibitShahkarProvider', () => {
  it('calls the matching endpoint with the documented query and headers', async () => {
    const fetchImpl = vi.fn(async () => json(200, { matched: true }));
    const p = new JibitShahkarProvider('Bearer abc', fetchImpl as unknown as typeof fetch);
    await expect(p.match('1234567891', '09123456789')).resolves.toBe(true);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, { headers: Record<string, string> }];
    expect(url).toBe('https://napi.jibit.ir/ide/v1/services/matching?nationalCode=1234567891&mobileNumber=09123456789');
    expect(init.headers['authorization']).toBe('Bearer abc');
    expect(init.headers['x-track-id']).toMatch(/[0-9a-f-]{36}/);
  });

  it('returns false for a mismatch and throws on errors', async () => {
    const no = new JibitShahkarProvider('a', vi.fn(async () => json(200, { matched: false })) as unknown as typeof fetch);
    await expect(no.match('1', '2')).resolves.toBe(false);
    const busy = new JibitShahkarProvider('a', vi.fn(async () => json(429, { code: 'handler.too_many_requests' })) as unknown as typeof fetch);
    await expect(busy.match('1', '2')).rejects.toMatchObject({ status: 429, code: 'handler.too_many_requests' });
    const odd = new JibitShahkarProvider('a', vi.fn(async () => json(200, {})) as unknown as typeof fetch);
    await expect(odd.match('1', '2')).rejects.toBeInstanceOf(ShahkarError);
  });
});

describe('IdentityService', () => {
  function setup(provider: ShahkarProvider | null, owner = false) {
    const prisma = {
      driverProfile: { findUnique: vi.fn().mockResolvedValue({ id: 'd1', nationalId: '1234567891', user: { phone: '09120000000' }, vehicles: [{ owner: owner ? { id: 'o1', nationalId: '1234567891', phone: '09121111111' } : null }] }) },
      kycItem: { findFirst: vi.fn().mockResolvedValue({ id: 'k1' }), update: vi.fn().mockResolvedValue({}) },
    };
    return { svc: new IdentityService(prisma as never, provider), prisma };
  }

  it('does nothing when no provider is configured (the expert decides)', async () => {
    const { svc, prisma } = setup(null);
    await svc.verifyRegistration('d1');
    expect(prisma.driverProfile.findUnique).not.toHaveBeenCalled();
  });

  it('stores the match on the national-ID item, for the driver and a different owner', async () => {
    const { svc, prisma } = setup({ name: 'jibit', match: vi.fn().mockResolvedValue(false) }, true);
    await svc.verifyRegistration('d1');
    expect(prisma.kycItem.update).toHaveBeenCalledTimes(2);
    expect(prisma.kycItem.update).toHaveBeenCalledWith({ where: { id: 'k1' }, data: { shahkarResult: expect.objectContaining({ mode: 'jibit', matched: false }) } });
  });

  it('records an outage as an error result instead of failing the registration', async () => {
    const { svc, prisma } = setup({ name: 'jibit', match: vi.fn().mockRejectedValue(new ShahkarError('HTTP 429')) });
    await expect(svc.verifyRegistration('d1')).resolves.toBeUndefined();
    expect(prisma.kycItem.update).toHaveBeenCalledWith({ where: { id: 'k1' }, data: { shahkarResult: expect.objectContaining({ error: 'HTTP 429' }) } });
  });
});

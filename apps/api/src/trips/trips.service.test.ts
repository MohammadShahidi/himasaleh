import { describe, expect, it, vi } from 'vitest';
import { TripsService } from './trips.service.js';

const driver = { id: 'd1', userId: 'u1', status: 'approved', online: true, firstName: 'حسن', lastName: 'کریمی', vehicles: [{ type: 'khavar', body: 'flatbed', plate1: '12', plateLetter: 'ع', plate2: '345', plate3: '67' }], user: {} };
const trip = (over: Record<string, unknown> = {}) => ({
  id: 't1', driverId: 'd1', status: 'assigned', step: 1, isTest: true, fareRial: 85_000_000n, driverFeeBp: 800, goods: 'سیمان', weightText: null,
  fromTitle: 'الف', fromAddr: 'ب', toTitle: 'ج', toAddr: 'د', waybillNo: '14050720-1234', trackCode: 'HM-1', notes: [], distanceKm: 42, ...over,
});

function setup(opts: { trip?: Record<string, unknown> | null; claimed?: number; online?: boolean; photoEventExists?: boolean; file?: { ownerId: string } | null } = {}) {
  const t = opts.trip === null ? null : trip(opts.trip);
  const prisma: Record<string, unknown> = {
    driverProfile: { findUnique: vi.fn().mockResolvedValue({ ...driver, online: opts.online ?? true }) },
    dispatchOffer: {
      findUnique: vi.fn().mockResolvedValue({ id: 'o1', driverId: 'd1', tripId: 't1', status: 'pending', expiresAt: new Date(Date.now() + 60_000) }),
      update: vi.fn().mockResolvedValue({}), updateMany: vi.fn().mockResolvedValue({}),
    },
    trip: {
      count: vi.fn().mockResolvedValue(0), updateMany: vi.fn().mockResolvedValue({ count: opts.claimed ?? 1 }), update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(t), findUniqueOrThrow: vi.fn().mockResolvedValue({ ...(t ?? {}), driver: { userId: 'u1' } }),
    },
    tripEvent: { upsert: vi.fn().mockResolvedValue({}), findFirst: vi.fn().mockResolvedValue(opts.photoEventExists ? { id: 'e' } : null) },
    fileObject: { findUnique: vi.fn().mockResolvedValue(opts.file === undefined ? { ownerId: 'u1' } : opts.file) },
  };
  prisma['$transaction'] = vi.fn(async (fn: (tx: unknown) => unknown) => fn(prisma));
  const ledger = { post: vi.fn().mockResolvedValue('x'), balance: vi.fn(), entries: vi.fn() };
  const audit = { log: vi.fn().mockResolvedValue(undefined) };
  const svc = new TripsService(prisma as never, {} as never, ledger as never, {} as never, audit as never);
  return { svc, prisma, ledger };
}

describe('TripsService.accept', () => {
  it('needs the driver to be on duty', async () => {
    const { svc } = setup({ online: false });
    await expect(svc.accept('u1', 'o1', 'ip')).rejects.toMatchObject({ response: { code: 'DRIVER_OFFLINE' } });
  });

  it('the first to accept gets the trip and the other offers close', async () => {
    const { svc, prisma } = setup({ claimed: 1 });
    await expect(svc.accept('u1', 'o1', 'ip')).resolves.toEqual({ tripId: 't1' });
    expect((prisma['dispatchOffer'] as { updateMany: ReturnType<typeof vi.fn> }).updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'taken' }) }));
  });

  it('a late driver is told the load is gone', async () => {
    const { svc, prisma } = setup({ claimed: 0 });
    await expect(svc.accept('u1', 'o1', 'ip')).rejects.toMatchObject({ response: { code: 'OFFER_TAKEN' } });
    expect((prisma['dispatchOffer'] as { update: ReturnType<typeof vi.fn> }).update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'taken' }) }));
  });
});

describe('TripsService.progress', () => {
  const at = new Date().toISOString();

  it('moves the trip one step and keeps the phone’s own time', async () => {
    const { svc, prisma } = setup();
    await svc.progress('u1', 't1', { step: 1, events: [{ step: 1, at, lat: 35.7, lng: 51.4 }] }, 'ip');
    expect((prisma['trip'] as { update: ReturnType<typeof vi.fn> }).update).toHaveBeenCalledWith({ where: { id: 't1' }, data: { step: 2, status: 'loading' } });
    expect((prisma['tripEvent'] as { upsert: ReturnType<typeof vi.fn> }).upsert).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ step: 1, clientAt: new Date(at) }) }));
  });

  it('re-sending an old batch changes nothing', async () => {
    const { svc, prisma } = setup({ trip: { step: 3, status: 'in_transit' } });
    await svc.progress('u1', 't1', { step: 1, events: [{ step: 1, at }] }, 'ip');
    expect((prisma['trip'] as { update: ReturnType<typeof vi.fn> }).update).not.toHaveBeenCalled();
  });

  it('delivery needs the signed waybill photo', async () => {
    const { svc } = setup({ trip: { step: 4, status: 'arrived' } });
    await expect(svc.progress('u1', 't1', { step: 4, events: [{ step: 4, at }] }, 'ip')).rejects.toMatchObject({ response: { code: 'PHOTO_REQUIRED' } });
  });

  it('refuses someone else’s photo', async () => {
    const { svc } = setup({ trip: { step: 4, status: 'arrived' }, file: { ownerId: 'someone-else' } });
    await expect(svc.progress('u1', 't1', { step: 4, events: [{ step: 4, at, photoFileId: 'f1' }] }, 'ip')).rejects.toMatchObject({ response: { code: 'FILE_NOT_FOUND' } });
  });

  it('delivery with the photo pays the driver and books the platform share, balanced', async () => {
    const { svc, ledger } = setup({ trip: { step: 4, status: 'arrived' } });
    await svc.progress('u1', 't1', { step: 4, events: [{ step: 4, at, photoFileId: 'f1' }] }, 'ip');
    const call = ledger.post.mock.calls[0]![0] as { idempotencyKey: string; lines: { account: string; amountRial: bigint }[] };
    expect(call.idempotencyKey).toBe('trip:t1:settle');
    expect(call.lines.reduce((a, l) => a + l.amountRial, 0n)).toBe(0n);
    expect(call.lines.find((l) => l.account === 'wallet:user:u1')!.amountRial).toBe(85_000_000n - 6_800_000n);
    expect(call.lines.find((l) => l.account === 'platform:revenue:fee')!.amountRial).toBe(6_800_000n);
  });

  it('a cancelled trip answers 409 so the phone can drop its queue', async () => {
    const { svc } = setup({ trip: { status: 'cancelled' } });
    await expect(svc.progress('u1', 't1', { step: 1, events: [{ step: 1, at }] }, 'ip')).rejects.toMatchObject({ response: { code: 'TRIP_CHANGED' } });
  });
});

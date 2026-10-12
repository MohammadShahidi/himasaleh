import { describe, expect, it, vi } from 'vitest';
import { NotifyService } from './notify.service.js';
import type { PushProvider } from './push.provider.js';

function setup(opts: { devices?: { id: string; token: string }[]; mode?: 'off' | 'fallback' | 'always'; push?: PushProvider['send'] }) {
  const prisma = {
    device: { findMany: vi.fn().mockResolvedValue(opts.devices ?? []), delete: vi.fn().mockResolvedValue({}), upsert: vi.fn(), deleteMany: vi.fn() },
    notificationLog: {
      create: vi.fn().mockResolvedValue({ id: 'n1' }), update: vi.fn().mockResolvedValue({}), updateMany: vi.fn(),
      findUnique: vi.fn().mockResolvedValue({ id: 'n1', ackedAt: null }),
    },
    user: { findUnique: vi.fn().mockResolvedValue({ phone: '09120000000' }) },
  };
  const settings = { get: vi.fn(async (k: string) => (k === 'notify.newLoadSms.mode' ? (opts.mode ?? 'fallback') : 60)) };
  const sms = { notifySafely: vi.fn().mockResolvedValue(undefined) };
  const jobs = { onQueue: vi.fn(), later: vi.fn().mockResolvedValue(undefined) };
  const push: PushProvider = { name: 't', send: opts.push ?? vi.fn().mockResolvedValue({}) };
  return { svc: new NotifyService(prisma as never, settings as never, sms as never, jobs as never, push), prisma, sms, jobs, push };
}

const load = { type: 'new_load', title: 'بار جدید', body: 'کرج', channel: 'loads' as const, sms: { template: 'new_load' as const, params: { CITY: 'کرج', GOODS: 'سیمان', FARE: '۸', MINUTES: '۵' }, mode: 'newLoad' as const } };

describe('NotifyService.notify (new load)', () => {
  it('fallback: no app → the SMS goes at once', async () => {
    const { svc, sms, jobs } = setup({ mode: 'fallback' });
    await svc.notify('u1', load);
    expect(sms.notifySafely).toHaveBeenCalledWith('09120000000', 'new_load', load.sms.params);
    expect(jobs.later).not.toHaveBeenCalled();
  });

  it('fallback: push delivered → SMS only after the wait, and only if not acknowledged', async () => {
    const { svc, sms, jobs, prisma } = setup({ devices: [{ id: 'd1', token: 'tok' }], mode: 'fallback' });
    await svc.notify('u1', load);
    expect(sms.notifySafely).not.toHaveBeenCalled();
    expect(jobs.later).toHaveBeenCalledWith('notify.smsFallback', expect.objectContaining({ logId: 'n1', template: 'new_load' }), 60);
    // the job later: unacknowledged → SMS; acknowledged → nothing
    const run = (svc as unknown as { runFallback: (j: unknown) => Promise<void> }).runFallback.bind(svc);
    await run({ logId: 'n1', userId: 'u1', template: 'new_load', params: load.sms.params });
    expect(sms.notifySafely).toHaveBeenCalledTimes(1);
    prisma.notificationLog.findUnique.mockResolvedValue({ id: 'n1', ackedAt: new Date() });
    await run({ logId: 'n1', userId: 'u1', template: 'new_load', params: load.sms.params });
    expect(sms.notifySafely).toHaveBeenCalledTimes(1);
  });

  it('off: never sends an SMS, even with no app', async () => {
    const { svc, sms, jobs } = setup({ mode: 'off' });
    await svc.notify('u1', load);
    expect(sms.notifySafely).not.toHaveBeenCalled();
    expect(jobs.later).not.toHaveBeenCalled();
  });

  it('always: SMS together with the push', async () => {
    const { svc, sms } = setup({ devices: [{ id: 'd1', token: 'tok' }], mode: 'always' });
    await svc.notify('u1', load);
    expect(sms.notifySafely).toHaveBeenCalledTimes(1);
  });

  it('a push failure counts as not delivered, so fallback sends the SMS at once', async () => {
    const { svc, sms, prisma } = setup({ devices: [{ id: 'd1', token: 'tok' }], mode: 'fallback', push: vi.fn().mockRejectedValue(new Error('fcm down')) });
    const r = await svc.notify('u1', load);
    expect(r.delivered).toBe(0);
    expect(prisma.notificationLog.update).toHaveBeenCalledWith({ where: { id: 'n1' }, data: expect.objectContaining({ status: 'failed', error: 'fcm down' }) });
    expect(sms.notifySafely).toHaveBeenCalledTimes(1);
  });

  it('removes a device whose token the provider says is dead', async () => {
    const { svc, prisma } = setup({ devices: [{ id: 'd1', token: 'tok' }], push: vi.fn().mockResolvedValue({ invalidToken: true }) });
    await svc.notify('u1', { type: 'x', title: 't', body: 'b' });
    expect(prisma.device.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
  });
});

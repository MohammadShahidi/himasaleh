import { describe, expect, it, vi } from 'vitest';
import { KycService } from './kyc.service.js';

type Item = { id: string; kind: string; status: string; rejectReason?: string | null; createdAt: Date };
const now = new Date();
const it_ = (kind: string, status = 'approved', rejectReason: string | null = null): Item => ({ id: `i-${kind}`, kind, status, rejectReason, createdAt: now });
const SELF = ['national_id_front', 'national_id_back', 'vehicle_card_front', 'vehicle_card_back', 'green_sheet', 'selfie_video'];

function setup(opts: { status?: string; owner?: { id: string; relation: string } | null; items: Item[] }) {
  const driver = {
    id: 'd1', status: opts.status ?? 'submitted', firstName: 'حسن', user: { phone: '09120000000' },
    vehicles: [{ owner: opts.owner ?? null }],
  };
  const prisma = {
    driverProfile: { findUnique: vi.fn().mockResolvedValue(driver), update: vi.fn().mockResolvedValue({}) },
    kycItem: { findMany: vi.fn().mockResolvedValue(opts.items) },
    vehicleOwner: { findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
  };
  const audit = { log: vi.fn().mockResolvedValue(undefined) };
  const sms = { notifySafely: vi.fn().mockResolvedValue(undefined) };
  const settings = { get: vi.fn().mockResolvedValue(24) };
  const jobs = { every: vi.fn() };
  return { svc: new KycService(prisma as never, audit as never, sms as never, settings as never, jobs as never), prisma, sms };
}

describe('KycService.finish', () => {
  it('approves a driver whose documents are all approved and sends one SMS', async () => {
    const { svc, prisma, sms } = setup({ items: SELF.map((k) => it_(k)) });
    await expect(svc.finish('staff1', 'd1', 'ip')).resolves.toEqual({ status: 'approved' });
    expect(prisma.driverProfile.update).toHaveBeenCalledWith({ where: { id: 'd1' }, data: expect.objectContaining({ status: 'approved' }) });
    expect(sms.notifySafely).toHaveBeenCalledWith('09120000000', 'driver_approved', { NAME: 'حسن' });
  });

  it('sends the driver back to fix only the rejected document, with one SMS naming it and the reason', async () => {
    const items = SELF.map((k) => (k === 'green_sheet' ? it_(k, 'rejected', 'ناخوانا بودن') : it_(k)));
    const { svc, prisma, sms } = setup({ items });
    const r = await svc.finish('staff1', 'd1', 'ip');
    expect(r.status).toBe('needs_fix');
    expect(prisma.driverProfile.update).toHaveBeenCalledWith({ where: { id: 'd1' }, data: { status: 'needs_fix' } });
    expect(sms.notifySafely).toHaveBeenCalledTimes(1);
    expect(sms.notifySafely).toHaveBeenCalledWith('09120000000', 'driver_rejected', { NAME: 'حسن', DOC: 'برگ سبز', REASON: 'ناخوانا بودن' });
  });

  it('with several rejected documents keeps the SMS within the 25-character limit', async () => {
    const items = SELF.map((k) => (k === 'green_sheet' ? it_(k, 'rejected', 'ناخوانا بودن') : k === 'national_id_back' ? it_(k, 'rejected', 'جعلی بودن') : it_(k)));
    const { svc, sms } = setup({ items });
    await svc.finish('staff1', 'd1', 'ip');
    const params = sms.notifySafely.mock.calls[0]![2] as Record<string, string>;
    expect(params.DOC).toBe('چند مدرک');
    expect(Object.values(params).every((v) => v.length <= 25)).toBe(true);
  });

  it('refuses to finish while an item is still pending', async () => {
    const { svc } = setup({ items: SELF.map((k) => (k === 'selfie_video' ? it_(k, 'pending') : it_(k))) });
    await expect(svc.finish('staff1', 'd1', 'ip')).rejects.toMatchObject({ response: { code: 'REVIEW_INCOMPLETE', pending: ['selfie_video'] } });
  });

  it('waits for the owner consent video when the owner is someone else', async () => {
    const items = [...SELF, 'owner_national_id_front', 'owner_national_id_back'].map((k) => it_(k));
    const { svc } = setup({ owner: { id: 'o1', relation: 'father' }, items });
    await expect(svc.finish('staff1', 'd1', 'ip')).rejects.toMatchObject({ response: { code: 'WAITING_OWNER_VIDEO' } });
  });

  it('accepts an authorization document instead of the video for a non-first-degree owner only', async () => {
    const items = [...SELF, 'owner_national_id_front', 'owner_national_id_back', 'owner_authorization'].map((k) => it_(k));
    const partner = setup({ owner: { id: 'o1', relation: 'partner' }, items });
    await expect(partner.svc.finish('staff1', 'd1', 'ip')).resolves.toEqual({ status: 'approved' });
    const father = setup({ owner: { id: 'o1', relation: 'father' }, items });
    await expect(father.svc.finish('staff1', 'd1', 'ip')).rejects.toMatchObject({ response: { code: 'WAITING_OWNER_VIDEO' } });
  });
});

describe('KycService.remindOwnerVideos', () => {
  it('reminds the driver once and records it', async () => {
    const { svc, prisma, sms } = setup({ items: [] });
    prisma.vehicleOwner.findMany.mockResolvedValue([{ id: 'o1', vehicle: { driver: { firstName: 'حسن', user: { phone: '09120000000' } } } }]);
    await expect(svc.remindOwnerVideos(now)).resolves.toBe(1);
    expect(sms.notifySafely).toHaveBeenCalledWith('09120000000', 'owner_video_reminder', { NAME: 'حسن' });
    expect(prisma.vehicleOwner.update).toHaveBeenCalledWith({ where: { id: 'o1' }, data: { videoReminderSentAt: now } });
  });
});

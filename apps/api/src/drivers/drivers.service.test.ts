import { describe, expect, it, vi } from 'vitest';
import { DriversService } from './drivers.service.js';

type Item = { kind: string; status: string; createdAt: Date };

function setup(opts: { status?: string; owner?: { id: string; relation: string; videoLinkSentAt: Date | null } | null; items?: Item[]; file?: { id: string; ownerId: string; mime: string } | null }) {
  const profile = {
    id: 'd1', userId: 'u1', status: opts.status ?? 'draft', address: 'تهران، خیابان آزادی', serviceCities: ['تهران'],
    vehicles: [{ id: 'v1', owner: opts.owner ?? null }],
  };
  const prisma = {
    driverProfile: { findUnique: vi.fn().mockResolvedValue(profile), findFirst: vi.fn().mockResolvedValue(null), update: vi.fn().mockResolvedValue({}) },
    kycItem: { findMany: vi.fn().mockResolvedValue(opts.items ?? []), create: vi.fn().mockResolvedValue({ id: 'k1', kind: 'green_sheet', status: 'pending' }) },
    fileObject: { findUnique: vi.fn().mockResolvedValue(opts.file ?? null) },
  };
  const audit = { log: vi.fn().mockResolvedValue(undefined) };
  return { svc: new DriversService(prisma as never, audit as never), prisma, audit };
}

const now = new Date();
const ok = (kind: string): Item => ({ kind, status: 'pending', createdAt: now });
const SELF_KINDS = ['national_id_front', 'national_id_back', 'vehicle_card_front', 'vehicle_card_back', 'green_sheet', 'selfie_video'];

describe('DriversService.submit', () => {
  it('lists the documents that are still missing', async () => {
    const { svc } = setup({ items: [ok('national_id_front')] });
    await expect(svc.submit('u1', '1.1.1.1')).rejects.toMatchObject({ response: { code: 'MISSING_DOCUMENTS', missing: expect.arrayContaining(['green_sheet', 'selfie_video']) } });
  });

  it('does not count a rejected upload as present', async () => {
    const items = SELF_KINDS.map((k) => (k === 'green_sheet' ? { ...ok(k), status: 'rejected' } : ok(k)));
    const { svc } = setup({ items });
    await expect(svc.submit('u1', '1.1.1.1')).rejects.toMatchObject({ response: { code: 'MISSING_DOCUMENTS', missing: ['green_sheet'] } });
  });

  it('sends a complete self-owned registration to the expert', async () => {
    const { svc, prisma, audit } = setup({ items: SELF_KINDS.map(ok) });
    await svc.submit('u1', '1.1.1.1');
    expect(prisma.driverProfile.update).toHaveBeenCalledWith({ where: { id: 'd1' }, data: expect.objectContaining({ status: 'submitted' }) });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'driver.submit' }));
  });

  it('asks for the owner proof when the owner is a partner and only a link was sent', async () => {
    const owner = { id: 'o1', relation: 'partner', videoLinkSentAt: now };
    const items = [...SELF_KINDS, 'owner_national_id_front', 'owner_national_id_back'].map(ok);
    const { svc } = setup({ owner, items });
    await expect(svc.submit('u1', '1.1.1.1')).rejects.toMatchObject({ response: { code: 'OWNER_PROOF' } });
  });

  it('refuses a registration that is already with an expert', async () => {
    const { svc } = setup({ status: 'submitted', items: SELF_KINDS.map(ok) });
    await expect(svc.submit('u1', '1.1.1.1')).rejects.toMatchObject({ response: { code: 'ALREADY_SUBMITTED' } });
  });
});

describe('DriversService.attach', () => {
  it('rejects an image for the identity video and someone else’s file', async () => {
    const wrongType = setup({ file: { id: 'f1', ownerId: 'u1', mime: 'image/jpeg' } });
    await expect(wrongType.svc.attach('u1', { kind: 'selfie_video', fileId: 'f1' })).rejects.toMatchObject({ response: { code: 'FILE_TYPE' } });
    const foreign = setup({ file: { id: 'f1', ownerId: 'someone-else', mime: 'image/jpeg' } });
    await expect(foreign.svc.attach('u1', { kind: 'green_sheet', fileId: 'f1' })).rejects.toMatchObject({ response: { code: 'FILE_NOT_FOUND' } });
  });

  it('only accepts owner documents when the owner is someone else', async () => {
    const { svc } = setup({ owner: null, file: { id: 'f1', ownerId: 'u1', mime: 'image/jpeg' } });
    await expect(svc.attach('u1', { kind: 'owner_national_id_front', fileId: 'f1' })).rejects.toMatchObject({ response: { code: 'NO_OWNER' } });
  });

  it('after a rejection only the rejected items can be replaced', async () => {
    const items = [{ ...ok('green_sheet'), status: 'rejected' }, ok('national_id_front')];
    const { svc, prisma } = setup({ status: 'needs_fix', items, file: { id: 'f1', ownerId: 'u1', mime: 'image/jpeg' } });
    await expect(svc.attach('u1', { kind: 'national_id_front', fileId: 'f1' })).rejects.toMatchObject({ response: { code: 'NOT_REJECTED' } });
    await svc.attach('u1', { kind: 'green_sheet', fileId: 'f1' });
    expect(prisma.kycItem.create).toHaveBeenCalledTimes(1);
  });
});

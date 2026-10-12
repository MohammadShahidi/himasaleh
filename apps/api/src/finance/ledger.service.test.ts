import { describe, expect, it, vi } from 'vitest';
import { LedgerService } from './ledger.service.js';

function setup(existing: { id: string } | null = null) {
  const tx = {
    ledgerTxn: { create: vi.fn().mockResolvedValue({ id: 't1' }) },
    accountBalance: { upsert: vi.fn().mockResolvedValue({}) },
  };
  const prisma = { ledgerTxn: { findUnique: vi.fn().mockResolvedValue(existing) }, $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)), accountBalance: { findUnique: vi.fn() } };
  return { svc: new LedgerService(prisma as never), tx, prisma };
}

describe('LedgerService.post', () => {
  it('refuses a transaction whose lines do not sum to zero', async () => {
    const { svc, prisma } = setup();
    await expect(svc.post({ kind: 'x', lines: [{ account: 'a', amountRial: 10n }, { account: 'b', amountRial: -9n }] })).rejects.toMatchObject({ response: { code: 'LEDGER_UNBALANCED' } });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuses a single-line transaction', async () => {
    const { svc } = setup();
    await expect(svc.post({ kind: 'x', lines: [{ account: 'a', amountRial: 0n }] })).rejects.toMatchObject({ response: { code: 'LEDGER_INVALID' } });
  });

  it('posts the entries and moves every balance in the same database transaction', async () => {
    const { svc, tx } = setup();
    await svc.post({ kind: 'settle', lines: [{ account: 'escrow', amountRial: -100n }, { account: 'wallet', amountRial: 92n }, { account: 'fee', amountRial: 8n }] });
    expect(tx.ledgerTxn.create).toHaveBeenCalledTimes(1);
    expect(tx.accountBalance.upsert).toHaveBeenCalledTimes(3);
    expect(tx.accountBalance.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { account: 'escrow' }, update: { balanceRial: { increment: -100n } } }));
  });

  it('does not post twice for the same idempotency key', async () => {
    const { svc, prisma } = setup({ id: 'earlier' });
    await expect(svc.post({ kind: 'x', idempotencyKey: 'k', lines: [{ account: 'a', amountRial: 1n }, { account: 'b', amountRial: -1n }] })).resolves.toBe('earlier');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

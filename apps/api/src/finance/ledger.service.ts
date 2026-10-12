import { HttpStatus, Injectable } from '@nestjs/common';
import { AppError } from '../common/errors.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface LedgerLine {
  /** e.g. `wallet:user:cl123`, `platform:revenue:fee` (ARCHITECTURE §7.1) */
  account: string;
  /** signed rials: positive = credit, negative = debit */
  amountRial: bigint;
}

export interface LedgerPost {
  kind: string;
  ref?: string;
  /** the same key never posts twice (safe retries) */
  idempotencyKey?: string;
  meta?: object;
  lines: LedgerLine[];
}

/** Double-entry ledger (ARCHITECTURE §7): the lines of one transaction sum to zero; balances move in the same database transaction. */
@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the transaction id; if `idempotencyKey` was already posted, returns the earlier one without posting again. */
  async post(p: LedgerPost): Promise<string> {
    if (p.lines.length < 2) throw new AppError(HttpStatus.INTERNAL_SERVER_ERROR, 'LEDGER_INVALID', 'تراکنش مالی باید حداقل دو سطر داشته باشد.');
    const sum = p.lines.reduce((a, l) => a + l.amountRial, 0n);
    if (sum !== 0n) throw new AppError(HttpStatus.INTERNAL_SERVER_ERROR, 'LEDGER_UNBALANCED', 'جمع سطرهای تراکنش مالی صفر نیست.');

    if (p.idempotencyKey) {
      const existing = await this.prisma.ledgerTxn.findUnique({ where: { idempotencyKey: p.idempotencyKey }, select: { id: true } });
      if (existing) return existing.id;
    }
    return this.prisma.$transaction(async (tx) => {
      const txn = await tx.ledgerTxn.create({
        data: {
          kind: p.kind, ref: p.ref ?? null, idempotencyKey: p.idempotencyKey ?? null, ...(p.meta ? { meta: p.meta as never } : {}),
          entries: { create: p.lines.map((l) => ({ account: l.account, amountRial: l.amountRial })) },
        },
      });
      for (const l of p.lines) {
        await tx.accountBalance.upsert({
          where: { account: l.account },
          create: { account: l.account, balanceRial: l.amountRial },
          update: { balanceRial: { increment: l.amountRial } },
        });
      }
      return txn.id;
    });
  }

  async balance(account: string): Promise<bigint> {
    return (await this.prisma.accountBalance.findUnique({ where: { account } }))?.balanceRial ?? 0n;
  }

  /** Newest entries of an account, for the driver's «پول من» list. */
  async entries(account: string, limit = 30) {
    return this.prisma.ledgerEntry.findMany({
      where: { account },
      orderBy: { txn: { createdAt: 'desc' } },
      take: limit,
      include: { txn: { select: { kind: true, ref: true, createdAt: true, meta: true } } },
    });
  }
}

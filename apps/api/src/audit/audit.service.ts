import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface AuditEntry {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string;
}

/** «گزارش فعالیت»: who did what, with before/after values for sensitive changes. */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(e: AuditEntry) {
    await this.prisma.auditLog.create({
      data: {
        actorId: e.actorId ?? null,
        action: e.action,
        entity: e.entity,
        entityId: e.entityId ?? null,
        before: e.before === undefined ? undefined : (JSON.parse(JSON.stringify(e.before)) as never),
        after: e.after === undefined ? undefined : (JSON.parse(JSON.stringify(e.after)) as never),
        ip: e.ip ?? null,
      },
    });
  }
}

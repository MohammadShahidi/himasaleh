import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { normalizeMobile } from '@hm/shared';
import { ENV, type Env } from '../env.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Gives the staff role to the mobiles listed in STAFF_BOOTSTRAP_PHONES when the API starts (idempotent).
 * Until the staff management screens exist (phase 3) this is the only way to get the first staff account without database access.
 * The listed person still signs in with a normal SMS code.
 */
@Injectable()
export class StaffBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StaffBootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async onApplicationBootstrap() {
    const raw = this.env.STAFF_BOOTSTRAP_PHONES;
    if (!raw) return;
    for (const item of raw.split(',').map((x) => x.trim()).filter(Boolean)) {
      const phone = normalizeMobile(item);
      if (!phone) { this.logger.warn(`STAFF_BOOTSTRAP_PHONES: "${item}" is not a valid mobile; skipped`); continue; }
      const user = await this.prisma.user.upsert({ where: { phone }, create: { phone, fullName: 'کارشناس' }, update: {} });
      await this.prisma.userRole.upsert({ where: { userId_role: { userId: user.id, role: 'staff' } }, create: { userId: user.id, role: 'staff' }, update: {} });
      this.logger.log(`staff role ensured for ${phone.slice(0, 4)}…${phone.slice(-2)}`);
    }
  }
}

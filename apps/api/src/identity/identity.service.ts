import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ShahkarProvider } from './shahkar.provider.js';

export const SHAHKAR_PROVIDER = Symbol('SHAHKAR_PROVIDER');

/**
 * Automatic mobile ↔ national ID check for a submitted registration (the driver and, if different, the owner).
 * The result is saved on the national-ID item for the expert to see; the expert can still override it by hand.
 * With no provider configured (`manual`) nothing runs and the expert decides.
 */
@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SHAHKAR_PROVIDER) private readonly provider: ShahkarProvider | null,
  ) {}

  async verifyRegistration(driverId: string) {
    if (!this.provider) return;
    const d = await this.prisma.driverProfile.findUnique({
      where: { id: driverId },
      include: { user: { select: { phone: true } }, vehicles: { take: 1, orderBy: { createdAt: 'asc' }, include: { owner: true } } },
    });
    if (!d) return;
    const owner = d.vehicles[0]?.owner ?? null;
    await this.check({ driverId: d.id }, 'national_id_front', d.nationalId, d.user.phone);
    if (owner) await this.check({ ownerId: owner.id }, 'owner_national_id_front', owner.nationalId, owner.phone);
  }

  private async check(where: { driverId: string } | { ownerId: string }, kind: 'national_id_front' | 'owner_national_id_front', nationalId: string, mobile: string) {
    const item = await this.prisma.kycItem.findFirst({ where: { ...where, kind }, orderBy: { createdAt: 'desc' } });
    if (!item) return;
    const provider = this.provider!;
    let result: Record<string, unknown>;
    try {
      const matched = await provider.match(nationalId, mobile);
      result = { mode: provider.name, matched, at: new Date().toISOString() };
    } catch (err) {
      // A provider outage must not block registration: the expert sees "error" and decides by hand.
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Shahkar check failed for ${kind}: ${msg}`);
      result = { mode: provider.name, error: msg.slice(0, 200), at: new Date().toISOString() };
    }
    await this.prisma.kycItem.update({ where: { id: item.id }, data: { shahkarResult: result as never } });
  }
}

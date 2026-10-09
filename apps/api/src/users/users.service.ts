import { HttpStatus, Injectable } from '@nestjs/common';
import type { Role, SessionUser, SelfSignupRole } from '@hm/shared';
import { AppError } from '../common/errors.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface SignupInput {
  role: SelfSignupRole;
  fullName: string;
  orgName?: string;
  referralCode?: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async rolesOf(userId: string): Promise<Role[]> {
    const rows = await this.prisma.userRole.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
    return rows.map((r) => r.role);
  }

  findByPhone(phone: string) {
    return this.prisma.user.findUnique({ where: { phone }, include: { roles: { orderBy: { createdAt: 'asc' } } } });
  }

  /** New account, or a new role on an existing account (one phone = one account, many roles). */
  async signup(phone: string, input: SignupInput) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { phone } });
      const user = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: { fullName: existing.fullName ?? input.fullName, orgName: existing.orgName ?? input.orgName ?? null },
          })
        : await tx.user.create({
            data: { phone, fullName: input.fullName, orgName: input.orgName ?? null, referredByCode: input.referralCode ?? null },
          });
      await tx.userRole.upsert({
        where: { userId_role: { userId: user.id, role: input.role } },
        create: { userId: user.id, role: input.role },
        update: {},
      });
      return user;
    });
  }

  async sessionUser(userId: string, activeRole: Role): Promise<SessionUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status === 'disabled') throw new AppError(HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED', 'دوباره وارد شوید.');
    return { id: user.id, phone: user.phone, fullName: user.fullName, roles: await this.rolesOf(user.id), activeRole };
  }
}

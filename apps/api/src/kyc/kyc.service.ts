import { HttpStatus, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import {
  type KycKind, KYC_KIND_LABEL, needsOwnerAuthorization, type OwnerRelation, type RejectReason, REJECT_REASONS, requiredKinds,
} from '@hm/shared';
import { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import { AppError } from '../common/errors.js';
import { JobsService } from '../jobs/jobs.service.js';
import { SmsService } from '../notifications/sms.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';

export const reviewItemSchema = z
  .object({
    decision: z.enum(['approve', 'reject']),
    reason: z.enum(REJECT_REASONS).optional(),
    /** National-ID items only: the expert's manual mobile ↔ national ID match, until a Shahkar provider is connected. */
    shahkarMatch: z.boolean().optional(),
  })
  .refine((v) => v.decision !== 'reject' || !!v.reason, { path: ['reason'], message: 'علت رد را انتخاب کنید' });
export type ReviewItem = z.output<typeof reviewItemSchema>;

/** Expert review of driver registrations (process doc: «بررسی مدارک»). Permission matrix arrives in phase 3; staff only for now. */
@Injectable()
export class KycService implements OnModuleInit {
  private readonly logger = new Logger(KycService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sms: SmsService,
    private readonly settings: SettingsService,
    private readonly jobs: JobsService,
  ) {}

  async onModuleInit() {
    await this.jobs.every('kyc.ownerVideoReminder', '*/30 * * * *', async () => { await this.remindOwnerVideos(); });
  }

  /** Registrations waiting for an expert, oldest first. */
  async queue() {
    const rows = await this.prisma.driverProfile.findMany({
      where: { status: 'submitted' },
      orderBy: { submittedAt: 'asc' },
      select: { id: true, firstName: true, lastName: true, nationalId: true, city: true, submittedAt: true },
    });
    return { drivers: rows };
  }

  private async load(driverId: string) {
    const d = await this.prisma.driverProfile.findUnique({
      where: { id: driverId },
      include: { user: { select: { phone: true } }, vehicles: { include: { owner: true }, orderBy: { createdAt: 'asc' }, take: 1 } },
    });
    if (!d) throw new AppError(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'راننده پیدا نشد.');
    const owner = d.vehicles[0]?.owner ?? null;
    const items = await this.prisma.kycItem.findMany({
      where: { OR: [{ driverId }, ...(owner ? [{ ownerId: owner.id }] : [])] },
      orderBy: { createdAt: 'desc' },
    });
    const latest = new Map<KycKind, (typeof items)[number]>();
    for (const it of items) if (!latest.has(it.kind)) latest.set(it.kind, it);
    return { d, owner, latest };
  }

  /** Everything the expert sees for one driver. Files are opened through GET /files/:id/url (audited). */
  async detail(driverId: string) {
    const { d, owner, latest } = await this.load(driverId);
    const v = d.vehicles[0] ?? null;
    return {
      id: d.id, status: d.status, phone: d.user.phone, firstName: d.firstName, lastName: d.lastName, nationalId: d.nationalId,
      licenseNo: d.licenseNo, province: d.province, city: d.city, serviceCities: d.serviceCities, address: d.address, lat: d.lat, lng: d.lng,
      vehicle: v && { type: v.type, body: v.body, capacityTon: v.capacityTon, year: v.year, plate: `${v.plate1} ${v.plateLetter} ${v.plate2} - ${v.plate3}` },
      owner: owner && {
        firstName: owner.firstName, lastName: owner.lastName, nationalId: owner.nationalId, phone: owner.phone,
        relation: owner.relation, relationOther: owner.relationOther, videoLinkIssuedAt: owner.videoLinkSentAt,
      },
      items: [...latest.values()].map((i) => ({
        id: i.id, kind: i.kind, label: KYC_KIND_LABEL[i.kind], fileId: i.fileId, status: i.status, rejectReason: i.rejectReason,
        scriptSnapshot: i.scriptSnapshot, shahkarResult: i.shahkarResult, createdAt: i.createdAt,
      })),
      rejectReasons: REJECT_REASONS,
    };
  }

  /** Approve or reject one document. Only the newest, still pending item of a submitted registration can be judged. */
  async reviewItem(staffId: string, itemId: string, body: ReviewItem, ip: string) {
    const item = await this.prisma.kycItem.findUnique({ where: { id: itemId }, include: { driver: true, owner: { include: { vehicle: { include: { driver: true } } } } } });
    const driver = item?.driver ?? item?.owner?.vehicle.driver ?? null;
    if (!item || !driver) throw new AppError(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'مدرک پیدا نشد.');
    if (driver.status !== 'submitted') throw new AppError(HttpStatus.CONFLICT, 'NOT_IN_REVIEW', 'این ثبت‌نام در صف بررسی نیست.');
    if (item.status !== 'pending') throw new AppError(HttpStatus.CONFLICT, 'ALREADY_REVIEWED', 'این مدرک قبلاً بررسی شده است.');

    const approve = body.decision === 'approve';
    const shahkar = item.kind === 'national_id_front' && body.shahkarMatch !== undefined
      ? { mode: 'manual', match: body.shahkarMatch, by: staffId, at: new Date().toISOString() }
      : undefined;
    const updated = await this.prisma.kycItem.update({
      where: { id: item.id },
      data: {
        status: approve ? 'approved' : 'rejected', rejectReason: approve ? null : body.reason!, reviewedById: staffId, reviewedAt: new Date(),
        ...(shahkar ? { shahkarResult: shahkar } : {}),
      },
    });
    await this.audit.log({
      actorId: staffId, action: approve ? 'kyc.approve' : 'kyc.reject', entity: 'kyc', entityId: item.id,
      before: { status: item.status }, after: { status: updated.status, reason: updated.rejectReason, kind: item.kind }, ip,
    });
    return { id: updated.id, status: updated.status, rejectReason: updated.rejectReason };
  }

  /**
   * Ends the review: if any item was rejected the driver goes back to fix just those (one SMS); otherwise the driver is
   * approved (one SMS). Every item must have been judged, and a different owner's consent must be on file.
   */
  async finish(staffId: string, driverId: string, ip: string) {
    const { d, owner, latest } = await this.load(driverId);
    if (d.status !== 'submitted') throw new AppError(HttpStatus.CONFLICT, 'NOT_IN_REVIEW', 'این ثبت‌نام در صف بررسی نیست.');

    const pending = [...latest.values()].filter((i) => i.status === 'pending').map((i) => i.kind);
    if (pending.length) throw new AppError(HttpStatus.CONFLICT, 'REVIEW_INCOMPLETE', 'همهٔ مدارک باید تأیید یا رد شوند.', { pending });

    const rejected = [...latest.values()].filter((i) => i.status === 'rejected');
    const firstName = d.firstName;
    if (rejected.length) {
      await this.prisma.driverProfile.update({ where: { id: d.id }, data: { status: 'needs_fix' } });
      await this.audit.log({ actorId: staffId, action: 'kyc.needsFix', entity: 'driver', entityId: d.id, before: { status: d.status }, after: { status: 'needs_fix', rejected: rejected.map((r) => r.kind) }, ip });
      const one = rejected[0]!;
      const sameReason = rejected.every((r) => r.rejectReason === one.rejectReason);
      await this.sms.notifySafely(d.user.phone, 'driver_rejected', {
        NAME: firstName,
        DOC: rejected.length === 1 ? KYC_KIND_LABEL[one.kind] : 'چند مدرک',
        REASON: sameReason ? (one.rejectReason as RejectReason) : 'جزئیات در پنل راننده',
      });
      return { status: 'needs_fix' as const, rejected: rejected.map((r) => ({ kind: r.kind, reason: r.rejectReason })) };
    }

    const have = new Set<KycKind>([...latest.entries()].filter(([, v]) => v.status === 'approved').map(([k]) => k));
    const missing = requiredKinds(owner ? { relation: owner.relation } : null).filter((k) => !have.has(k));
    if (missing.length) throw new AppError(HttpStatus.CONFLICT, 'MISSING_DOCUMENTS', 'مدارک لازم کامل نیست.', { missing });
    if (owner) {
      const rel = owner.relation as OwnerRelation;
      // Every different owner must have consented on video; a non-first-degree owner may instead have an authorization document.
      const ok = have.has('owner_video') || (needsOwnerAuthorization(rel) && have.has('owner_authorization'));
      if (!ok) throw new AppError(HttpStatus.CONFLICT, 'WAITING_OWNER_VIDEO', 'ویدیوی رضایت مالک هنوز نرسیده است.');
    }

    await this.prisma.driverProfile.update({ where: { id: d.id }, data: { status: 'approved', approvedAt: new Date() } });
    await this.audit.log({ actorId: staffId, action: 'kyc.driverApproved', entity: 'driver', entityId: d.id, before: { status: d.status }, after: { status: 'approved' }, ip });
    await this.sms.notifySafely(d.user.phone, 'driver_approved', { NAME: firstName });
    return { status: 'approved' as const };
  }

  /** Every 30 minutes: remind drivers (once) whose different owner has not recorded the consent video within the configured hours. */
  async remindOwnerVideos(now = new Date()) {
    const hours = await this.settings.get('kyc.ownerVideoReminderHours');
    const before = new Date(now.getTime() - hours * 3600_000);
    const owners = await this.prisma.vehicleOwner.findMany({
      where: {
        videoLinkSentAt: { lte: before }, videoReminderSentAt: null,
        kycItems: { none: { kind: 'owner_video' } },
        vehicle: { driver: { status: { in: ['draft', 'submitted', 'needs_fix'] } } },
      },
      include: { vehicle: { include: { driver: { include: { user: { select: { phone: true } } } } } } },
    });
    for (const o of owners) {
      const driver = o.vehicle.driver;
      await this.sms.notifySafely(driver.user.phone, 'owner_video_reminder', { NAME: driver.firstName });
      await this.prisma.vehicleOwner.update({ where: { id: o.id }, data: { videoReminderSentAt: now } });
    }
    if (owners.length) this.logger.log(`owner video reminders sent: ${owners.length}`);
    return owners.length;
  }
}

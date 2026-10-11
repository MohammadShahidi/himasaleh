import { createHash, randomBytes } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  type DriverProfileData, type KycAttach, type KycKind, kycSubjectOf, needsOwnerAuthorization, ownerProofOk, requiredKinds, VIDEO_KINDS,
  type OwnerRelation,
} from '@hm/shared';
import { AuditService } from '../audit/audit.service.js';
import { AppError } from '../common/errors.js';
import { ENV, type Env } from '../env.js';
import { IdentityService } from '../identity/identity.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** States in which the driver may still change the registration. */
const EDITABLE = ['draft', 'needs_fix'] as const;

@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
    private readonly identity: IdentityService,
  ) {}

  private async profileOf(userId: string) {
    return this.prisma.driverProfile.findUnique({
      where: { userId },
      include: { vehicles: { include: { owner: true }, orderBy: { createdAt: 'asc' }, take: 1 } },
    });
  }

  /** Newest item per (subject, kind): an older, rejected upload must not hide the replacement. */
  private async latestItems(driverId: string, ownerId: string | null) {
    const items = await this.prisma.kycItem.findMany({
      where: { OR: [{ driverId }, ...(ownerId ? [{ ownerId }] : [])] },
      orderBy: { createdAt: 'desc' },
    });
    const byKind = new Map<KycKind, (typeof items)[number]>();
    for (const it of items) if (!byKind.has(it.kind)) byKind.set(it.kind, it);
    return byKind;
  }

  /** The caller's own registration, with what is still missing and what the expert rejected. */
  async me(userId: string) {
    const p = await this.profileOf(userId);
    if (!p) return { profile: null };
    const vehicle = p.vehicles[0] ?? null;
    const owner = vehicle?.owner ?? null;
    const latest = await this.latestItems(p.id, owner?.id ?? null);

    const required = vehicle ? requiredKinds(owner ? { relation: owner.relation } : null) : [];
    const have = new Set([...latest.entries()].filter(([, v]) => v.status !== 'rejected').map(([k]) => k));
    return {
      profile: {
        id: p.id,
        status: p.status,
        firstName: p.firstName,
        lastName: p.lastName,
        nationalId: p.nationalId,
        licenseNo: p.licenseNo,
        refCode: p.refCode,
        province: p.province,
        city: p.city,
        serviceCities: p.serviceCities,
        address: p.address,
        postalCode: p.postalCode,
        lat: p.lat,
        lng: p.lng,
        online: p.online,
        submittedAt: p.submittedAt,
        vehicle: vehicle && {
          type: vehicle.type, body: vehicle.body, capacityTon: vehicle.capacityTon, year: vehicle.year,
          plate1: vehicle.plate1, plateLetter: vehicle.plateLetter, plate2: vehicle.plate2, plate3: vehicle.plate3,
        },
        owner: owner && {
          firstName: owner.firstName, lastName: owner.lastName, nationalId: owner.nationalId, phone: owner.phone,
          relation: owner.relation, relationOther: owner.relationOther, videoLinkSentAt: owner.videoLinkSentAt,
        },
      },
      items: [...latest.values()].map((i) => ({ kind: i.kind, status: i.status, rejectReason: i.rejectReason, fileId: i.fileId, createdAt: i.createdAt })),
      missing: required.filter((k) => !have.has(k)),
      rejected: [...latest.values()].filter((i) => i.status === 'rejected').map((i) => ({ kind: i.kind, reason: i.rejectReason })),
    };
  }

  /** Steps 1, 2 and 5: creates or updates the registration. Locked once it is with an expert or approved. */
  async save(userId: string, data: DriverProfileData, ip: string) {
    const existing = await this.profileOf(userId);
    if (existing && !(EDITABLE as readonly string[]).includes(existing.status))
      throw new AppError(HttpStatus.CONFLICT, 'DRIVER_LOCKED', 'ثبت‌نام شما در حال بررسی است و فعلاً قابل ویرایش نیست.');

    const taken = await this.prisma.driverProfile.findFirst({ where: { nationalId: data.nationalId, NOT: { userId } }, select: { id: true } });
    if (taken) throw new AppError(HttpStatus.CONFLICT, 'NATIONAL_ID_TAKEN', 'با این کد ملی قبلاً ثبت‌نام شده است. اگر اشتباه است با پشتیبانی تماس بگیرید.');

    const { vehicle, owner, ...profile } = data;
    const fields = {
      firstName: profile.firstName, lastName: profile.lastName, nationalId: profile.nationalId,
      licenseNo: profile.licenseNo ?? null, refCode: profile.refCode ?? null,
      province: profile.province ?? null, city: profile.city ?? null,
      serviceCities: [...new Set([...(profile.city ? [profile.city] : []), ...profile.serviceCities])],
      address: profile.address ?? null, postalCode: profile.postalCode ?? null, lat: profile.lat ?? null, lng: profile.lng ?? null,
    };
    const vehicleFields = {
      type: vehicle.type, body: vehicle.body, capacityTon: vehicle.capacityTon ?? null, year: vehicle.year ?? null,
      plate1: vehicle.plate1, plateLetter: vehicle.plateLetter, plate2: vehicle.plate2, plate3: vehicle.plate3,
    };

    const id = await this.prisma.$transaction(async (tx) => {
      const d = await tx.driverProfile.upsert({ where: { userId }, create: { userId, ...fields }, update: fields });
      const v = (await tx.vehicle.findFirst({ where: { driverId: d.id }, orderBy: { createdAt: 'asc' } }))
        ?? (await tx.vehicle.create({ data: { driverId: d.id, ...vehicleFields } }));
      await tx.vehicle.update({ where: { id: v.id }, data: vehicleFields });

      if (owner) {
        const o = {
          firstName: owner.firstName, lastName: owner.lastName, nationalId: owner.nationalId, phone: owner.phone,
          relation: owner.relation, relationOther: owner.relation === 'other' ? (owner.relationOther ?? null) : null,
        };
        await tx.vehicleOwner.upsert({ where: { vehicleId: v.id }, create: { vehicleId: v.id, ...o }, update: o });
      } else {
        await tx.vehicleOwner.deleteMany({ where: { vehicleId: v.id } });
      }
      await tx.user.updateMany({ where: { id: userId, fullName: null }, data: { fullName: `${profile.firstName} ${profile.lastName}` } });
      return d.id;
    });

    await this.audit.log({ actorId: userId, action: existing ? 'driver.update' : 'driver.register', entity: 'driver', entityId: id, ip });
    return this.me(userId);
  }

  /** Attaches an uploaded file (POST /files) as a document or video of the registration. */
  async attach(userId: string, body: KycAttach) {
    const p = await this.profileOf(userId);
    if (!p) throw new AppError(HttpStatus.CONFLICT, 'NO_REGISTRATION', 'اول اطلاعات فردی و خودرو را ثبت کنید.');
    if (!(EDITABLE as readonly string[]).includes(p.status))
      throw new AppError(HttpStatus.CONFLICT, 'DRIVER_LOCKED', 'ثبت‌نام شما در حال بررسی است و فعلاً قابل ویرایش نیست.');

    const subject = kycSubjectOf(body.kind);
    const owner = p.vehicles[0]?.owner ?? null;
    if (subject === 'owner' && !owner) throw new AppError(HttpStatus.BAD_REQUEST, 'NO_OWNER', 'مالک خودرو شما خودتان است؛ این مدرک لازم نیست.');

    const file = await this.prisma.fileObject.findUnique({ where: { id: body.fileId } });
    if (!file || file.ownerId !== userId) throw new AppError(HttpStatus.NOT_FOUND, 'FILE_NOT_FOUND', 'فایل پیدا نشد؛ دوباره بارگذاری کنید.');
    const isVideo = file.mime.startsWith('video/');
    if (VIDEO_KINDS.includes(body.kind) ? !isVideo : isVideo)
      throw new AppError(HttpStatus.BAD_REQUEST, 'FILE_TYPE', VIDEO_KINDS.includes(body.kind) ? 'برای این مورد باید ویدیو بفرستید.' : 'برای این مدرک تصویر یا PDF بفرستید.');

    if (p.status === 'needs_fix') {
      const latest = await this.latestItems(p.id, owner?.id ?? null);
      if (latest.get(body.kind)?.status !== 'rejected')
        throw new AppError(HttpStatus.CONFLICT, 'NOT_REJECTED', 'فقط مدارکی که کارشناس رد کرده را می‌توانید دوباره بفرستید.');
    }

    const item = await this.prisma.kycItem.create({
      data: {
        subject, kind: body.kind, fileId: file.id, scriptSnapshot: VIDEO_KINDS.includes(body.kind) ? (body.scriptSnapshot ?? null) : null,
        ...(subject === 'driver' ? { driverId: p.id } : { ownerId: owner!.id }),
      },
    });
    return { id: item.id, kind: item.kind, status: item.status };
  }

  /**
   * Issues the link a different owner opens to record the consent video. The driver copies it from the panel and
   * sends it himself (no SMS). Issuing again replaces the old link; only a hash of the token is stored.
   */
  async ownerVideoLink(userId: string, ip: string) {
    const p = await this.profileOf(userId);
    const owner = p?.vehicles[0]?.owner;
    if (!p || !owner) throw new AppError(HttpStatus.BAD_REQUEST, 'NO_OWNER', 'مالک خودرو شما خودتان است؛ لینک ضبط لازم نیست.');
    if (p.status === 'approved' || p.status === 'blocked') throw new AppError(HttpStatus.CONFLICT, 'DRIVER_LOCKED', 'ثبت‌نام شما بسته شده است.');
    const token = randomBytes(6).toString('base64url');
    await this.prisma.vehicleOwner.update({
      where: { id: owner.id },
      data: { videoTokenHash: createHash('sha256').update(token).digest('hex'), videoLinkSentAt: new Date(), videoReminderSentAt: null },
    });
    await this.audit.log({ actorId: userId, action: 'driver.ownerLink', entity: 'driver', entityId: p.id, ip });
    const scheme = this.env.NODE_ENV === 'production' ? 'https' : 'http';
    return { path: `/o/${token}`, url: `${scheme}://${this.env.APP_DOMAIN}/o/${token}` };
  }

  /** Sends the registration to an expert once everything required is present. */
  async submit(userId: string, ip: string) {
    const p = await this.profileOf(userId);
    if (!p) throw new AppError(HttpStatus.CONFLICT, 'NO_REGISTRATION', 'اول اطلاعات فردی و خودرو را ثبت کنید.');
    if (!(EDITABLE as readonly string[]).includes(p.status)) throw new AppError(HttpStatus.CONFLICT, 'ALREADY_SUBMITTED', 'ثبت‌نام شما قبلاً ارسال شده است.');
    const vehicle = p.vehicles[0];
    if (!vehicle || !p.address || !p.city || !p.province || !p.serviceCities.length)
      throw new AppError(HttpStatus.BAD_REQUEST, 'INCOMPLETE', 'اطلاعات ثبت‌نام کامل نیست.');

    const owner = vehicle.owner;
    const latest = await this.latestItems(p.id, owner?.id ?? null);
    const have = new Set<KycKind>([...latest.entries()].filter(([, v]) => v.status !== 'rejected').map(([k]) => k));
    const missing = requiredKinds(owner ? { relation: owner.relation } : null).filter((k) => !have.has(k));
    if (missing.length) throw new AppError(HttpStatus.BAD_REQUEST, 'MISSING_DOCUMENTS', 'مدارک لازم کامل نیست.', { missing });
    if (owner && !ownerProofOk(owner.relation as OwnerRelation, have, !!owner.videoLinkSentAt))
      throw new AppError(HttpStatus.BAD_REQUEST, 'OWNER_PROOF', needsOwnerAuthorization(owner.relation as OwnerRelation)
        ? 'برای این مالک وکالت‌نامه، رضایت‌نامه یا اجاره‌نامه، یا ویدیوی رضایت مالک لازم است.'
        : 'ویدیوی رضایت مالک را بارگذاری کنید یا لینک ضبط را برای او بفرستید.');

    await this.prisma.driverProfile.update({ where: { id: p.id }, data: { status: 'submitted', submittedAt: new Date() } });
    await this.audit.log({ actorId: userId, action: 'driver.submit', entity: 'driver', entityId: p.id, ip });
    // Automatic mobile ↔ national ID check; a failure here never blocks the submission.
    await this.identity.verifyRegistration(p.id).catch(() => undefined);
    return this.me(userId);
  }
}

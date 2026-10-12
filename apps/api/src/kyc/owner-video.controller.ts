import { createHash } from 'node:crypto';
import { Controller, Get, HttpCode, HttpStatus, Param, Post, Req } from '@nestjs/common';
import { consentScripts, OWNER_RELATION_LABEL, toFaDigits, type OwnerRelation } from '@hm/shared';
import { Public } from '../auth/decorators.js';
import { AppError } from '../common/errors.js';
import { type AppRequest, ipOf } from '../common/request.js';
import { AuditService } from '../audit/audit.service.js';
import { FilesService } from '../files/files.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Uploads one owner can make through one link (a retry or two is normal; more is abuse). */
const MAX_UPLOADS = 5;

/**
 * The page a different vehicle owner opens from the link the driver forwards (design: «ویدیو رضایت مالک»).
 * No sign-in: the unguessable token in the link is the credential, and only its hash is stored.
 */
@Controller('owner-video')
export class OwnerVideoController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
    private readonly audit: AuditService,
  ) {}

  private async byToken(token: string) {
    if (!/^[A-Za-z0-9_-]{6,32}$/.test(token)) throw new AppError(HttpStatus.NOT_FOUND, 'LINK_INVALID', 'این لینک معتبر نیست یا باطل شده است.');
    const owner = await this.prisma.vehicleOwner.findUnique({
      where: { videoTokenHash: createHash('sha256').update(token).digest('hex') },
      include: { vehicle: { include: { driver: true } } },
    });
    if (!owner) throw new AppError(HttpStatus.NOT_FOUND, 'LINK_INVALID', 'این لینک معتبر نیست یا باطل شده است.');
    return owner;
  }

  /** What the owner needs to see: the text to read aloud and who it is about. No other personal data. */
  @Public()
  @Get(':token')
  async info(@Param('token') token: string) {
    const o = await this.byToken(token);
    const d = o.vehicle.driver;
    const v = o.vehicle;
    const rel = o.relation as OwnerRelation;
    const plate = `${toFaDigits(v.plate1)} ${v.plateLetter} ${toFaDigits(v.plate2)} - ایران ${toFaDigits(v.plate3)}`;
    const scripts = consentScripts({
      driverName: `${d.firstName} ${d.lastName}`, driverNationalId: toFaDigits(d.nationalId), plate,
      owner: { name: `${o.firstName} ${o.lastName}`, nationalId: toFaDigits(o.nationalId), relation: rel === 'other' ? (o.relationOther ?? 'سایر') : OWNER_RELATION_LABEL[rel] },
    });
    const done = await this.prisma.kycItem.findFirst({ where: { ownerId: o.id, kind: 'owner_video', status: { not: 'rejected' } }, select: { id: true } });
    return { ownerName: `${o.firstName} ${o.lastName}`, driverName: `${d.firstName} ${d.lastName}`, plate, script: scripts.owner, alreadySent: !!done };
  }

  @Public()
  @Post(':token/video')
  @HttpCode(HttpStatus.CREATED)
  async upload(@Param('token') token: string, @Req() req: AppRequest) {
    const o = await this.byToken(token);
    const status = o.vehicle.driver.status;
    if (status === 'approved' || status === 'blocked') throw new AppError(HttpStatus.CONFLICT, 'CLOSED', 'این ثبت‌نام بسته شده است.');
    const count = await this.prisma.kycItem.count({ where: { ownerId: o.id, kind: 'owner_video' } });
    const approved = await this.prisma.kycItem.count({ where: { ownerId: o.id, kind: 'owner_video', status: 'approved' } });
    if (approved || count >= MAX_UPLOADS) throw new AppError(HttpStatus.CONFLICT, 'ENOUGH', 'ویدیوی شما قبلاً دریافت شده است.');

    const file = await this.files.upload(req, null, 'private');
    if (!file.mime.startsWith('video/')) throw new AppError(HttpStatus.BAD_REQUEST, 'FILE_TYPE', 'باید ویدیو بفرستید.');
    const info = await this.info(token);
    const item = await this.prisma.kycItem.create({ data: { subject: 'owner', ownerId: o.id, kind: 'owner_video', fileId: file.id, scriptSnapshot: info.script } });
    await this.audit.log({ action: 'owner.video', entity: 'kyc', entityId: item.id, ip: ipOf(req) });
    return { ok: true };
  }
}

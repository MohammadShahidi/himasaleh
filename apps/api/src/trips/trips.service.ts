import { HttpStatus, Injectable } from '@nestjs/common';
import {
  applyBp, formatToman, formatTomanWords, jalaliYmd, toFaDigits, VEHICLE_BODY_LABEL, VEHICLE_TYPE_LABEL,
  type VehicleBody, type VehicleType,
} from '@hm/shared';
import { AuditService } from '../audit/audit.service.js';
import { AppError } from '../common/errors.js';
import { LedgerService } from '../finance/ledger.service.js';
import { NotifyService } from '../notifications/notify.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import type { TripStatus } from '../generated/prisma/client.js';

const STATUS_LABEL: Record<TripStatus, string> = {
  open: 'در انتظار راننده', assigned: 'قبول شد', loading: 'در حال بارگیری', in_transit: 'در مسیر',
  arrived: 'رسیده به مقصد', delivered: 'تحویل شد', cancelled: 'لغو شد',
};
/** Trip status after the driver finished step N. */
const STATUS_AFTER_STEP: Record<number, TripStatus> = { 1: 'loading', 2: 'in_transit', 3: 'arrived', 4: 'delivered' };

export interface ProgressInput {
  /** the last step the driver finished (1–4) */
  step: number;
  /** each finished step with the phone's own time (the phone may have been offline) */
  events: { step: number; at: string; lat?: number | undefined; lng?: number | undefined; photoFileId?: string | undefined }[];
  clientSeq?: number | undefined;
}

export interface TestTripInput {
  goods?: string | undefined;
  weightText?: string | undefined;
  fareRial?: bigint | undefined;
  /** offer only to this driver; default: every approved driver who is online */
  driverId?: string | undefined;
}

const rial = (v: bigint) => v.toString();
const wayNo = (date: Date) => `${jalaliYmd(date)}-${String(1000 + Math.floor(Math.random() * 9000))}`;
const trackCode = () => `HM-${String(10000 + Math.floor(Math.random() * 90000))}`;

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly ledger: LedgerService,
    private readonly notify: NotifyService,
    private readonly audit: AuditService,
  ) {}

  private async approvedDriver(userId: string) {
    const d = await this.prisma.driverProfile.findUnique({ where: { userId }, include: { user: { select: { fullName: true, phone: true } }, vehicles: { take: 1, orderBy: { createdAt: 'asc' } } } });
    if (!d || d.status !== 'approved') throw new AppError(HttpStatus.FORBIDDEN, 'DRIVER_NOT_APPROVED', 'حساب شما هنوز تایید نشده است.');
    return d;
  }

  // ───────────────────────── driver panel ─────────────────────────

  async setOnline(userId: string, online: boolean) {
    const d = await this.approvedDriver(userId);
    await this.prisma.driverProfile.update({ where: { id: d.id }, data: { online } });
    return { online };
  }

  /** Open offers for the driver, newest first. Stale ones are marked expired on the way. */
  async offers(userId: string) {
    const d = await this.approvedDriver(userId);
    const now = new Date();
    await this.prisma.dispatchOffer.updateMany({ where: { driverId: d.id, status: 'pending', expiresAt: { lte: now } }, data: { status: 'expired' } });
    const rows = await this.prisma.dispatchOffer.findMany({
      where: { driverId: d.id, status: 'pending', trip: { status: 'open' } }, orderBy: { createdAt: 'desc' }, include: { trip: true },
    });
    return {
      online: d.online,
      offers: rows.map((o) => ({
        id: o.id, tripId: o.tripId, goods: o.trip.goods, weight: o.trip.weightText, from: o.trip.fromTitle, to: o.trip.toTitle,
        distance: o.trip.distanceKm == null ? null : `${toFaDigits(o.trip.distanceKm)} کیلومتر`, when: o.trip.whenText,
        fareRial: rial(o.fareRial), netRial: rial(o.fareRial - applyBp(o.fareRial, o.driverFeeBp)), feeBp: o.driverFeeBp,
        netWords: formatTomanWords(o.fareRial - applyBp(o.fareRial, o.driverFeeBp)), expiresAt: o.expiresAt,
      })),
    };
  }

  /** First driver to accept wins; the other offers of the trip become `taken`. */
  async accept(userId: string, offerId: string, ip: string) {
    const d = await this.approvedDriver(userId);
    if (!d.online) throw new AppError(HttpStatus.CONFLICT, 'DRIVER_OFFLINE', 'اول «سر کارم» را روشن کنید.');
    const offer = await this.prisma.dispatchOffer.findUnique({ where: { id: offerId } });
    if (!offer || offer.driverId !== d.id) throw new AppError(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'این بار پیدا نشد.');
    if (offer.status !== 'pending' || offer.expiresAt <= new Date()) throw new AppError(HttpStatus.CONFLICT, 'OFFER_CLOSED', 'مهلت این بار تمام شده است.');
    const active = await this.prisma.trip.count({ where: { driverId: d.id, status: { in: ['assigned', 'loading', 'in_transit', 'arrived'] } } });
    if (active) throw new AppError(HttpStatus.CONFLICT, 'TRIP_IN_PROGRESS', 'اول سفر فعلی را تمام کنید.');

    const won = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.trip.updateMany({ where: { id: offer.tripId, status: 'open', driverId: null }, data: { status: 'assigned', driverId: d.id, acceptedAt: new Date() } });
      if (claimed.count === 0) {
        await tx.dispatchOffer.update({ where: { id: offer.id }, data: { status: 'taken', respondedAt: new Date() } });
        return false;
      }
      await tx.dispatchOffer.update({ where: { id: offer.id }, data: { status: 'accepted', respondedAt: new Date() } });
      await tx.dispatchOffer.updateMany({ where: { tripId: offer.tripId, id: { not: offer.id }, status: 'pending' }, data: { status: 'taken', respondedAt: new Date() } });
      return true;
    });
    if (!won) throw new AppError(HttpStatus.CONFLICT, 'OFFER_TAKEN', 'این بار را راننده دیگری قبول کرد.');
    await this.audit.log({ actorId: userId, action: 'trip.accept', entity: 'trip', entityId: offer.tripId, ip });
    return { tripId: offer.tripId };
  }

  async reject(userId: string, offerId: string) {
    const d = await this.approvedDriver(userId);
    await this.prisma.dispatchOffer.updateMany({ where: { id: offerId, driverId: d.id, status: 'pending' }, data: { status: 'rejected', respondedAt: new Date() } });
  }

  /** The driver's active trip, or null. */
  async current(userId: string) {
    const d = await this.approvedDriver(userId);
    const t = await this.prisma.trip.findFirst({ where: { driverId: d.id, status: { in: ['assigned', 'loading', 'in_transit', 'arrived'] } }, orderBy: { acceptedAt: 'desc' } });
    return t ? this.tripDto(t, d) : null;
  }

  /**
   * The phone reports the steps it finished (ARCHITECTURE §3.6). One request carries all of them, so it works after being offline;
   * re-sending is harmless. A trip that was cancelled or reassigned meanwhile answers 409.
   */
  async progress(userId: string, tripId: string, input: ProgressInput, ip: string) {
    const d = await this.approvedDriver(userId);
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip || trip.driverId !== d.id) throw new AppError(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'سفر پیدا نشد.');
    if (trip.status === 'cancelled') throw new AppError(HttpStatus.CONFLICT, 'TRIP_CHANGED', 'این سفر لغو شده است.');
    if (input.step < 1 || input.step > 4) throw new AppError(HttpStatus.BAD_REQUEST, 'BAD_STEP', 'قدم معتبر نیست.');

    for (const ev of input.events) {
      if (ev.photoFileId) {
        const f = await this.prisma.fileObject.findUnique({ where: { id: ev.photoFileId } });
        if (!f || f.ownerId !== userId) throw new AppError(HttpStatus.NOT_FOUND, 'FILE_NOT_FOUND', 'عکس پیدا نشد؛ دوباره بفرستید.');
      }
    }
    // Delivery needs the signed waybill photo.
    if (input.step >= 4 && !input.events.some((e) => e.step === 4 && e.photoFileId) && !(await this.prisma.tripEvent.findFirst({ where: { tripId, step: 4, photoFileId: { not: null } } })))
      throw new AppError(HttpStatus.BAD_REQUEST, 'PHOTO_REQUIRED', 'برای تحویل، عکس برگ حمل امضا شده لازم است.');

    const newStatus = STATUS_AFTER_STEP[input.step]!;
    const advanced = input.step + 1 > trip.step;
    await this.prisma.$transaction(async (tx) => {
      for (const ev of input.events) {
        const data = { clientAt: new Date(ev.at), lat: ev.lat ?? null, lng: ev.lng ?? null, photoFileId: ev.photoFileId ?? null, clientSeq: input.clientSeq ?? null };
        await tx.tripEvent.upsert({ where: { tripId_step: { tripId, step: ev.step } }, create: { tripId, step: ev.step, ...data }, update: { ...data, photoFileId: data.photoFileId ?? undefined } });
      }
      if (advanced) {
        await tx.trip.update({
          where: { id: tripId },
          data: { step: input.step + 1, status: newStatus, ...(newStatus === 'delivered' ? { deliveredAt: new Date() } : {}) },
        });
      }
    });

    if (advanced && newStatus === 'delivered') {
      if (trip.isTest) await this.settleTestTrip(tripId);
      await this.audit.log({ actorId: userId, action: 'trip.delivered', entity: 'trip', entityId: tripId, ip });
    }
    const fresh = await this.prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
    return this.tripDto(fresh, d);
  }

  /** The driver's money: balance and latest entries. Read-only in phase 1. */
  async wallet(userId: string) {
    const d = await this.approvedDriver(userId);
    const account = `wallet:user:${userId}`;
    const balance = await this.ledger.balance(account);
    const entries = await this.ledger.entries(account, 30);
    const done = await this.prisma.trip.count({ where: { driverId: d.id, status: 'delivered' } });
    return {
      balanceRial: rial(balance), balanceWords: formatTomanWords(balance), tripsDone: done,
      entries: entries.map((e) => ({ id: e.id, kind: e.txn.kind, amountRial: rial(e.amountRial), amountText: formatToman(e.amountRial < 0n ? -e.amountRial : e.amountRial), credit: e.amountRial > 0n, at: e.txn.createdAt, title: (e.txn.meta as { title?: string } | null)?.title ?? e.txn.kind })),
    };
  }

  // ───────────────────────── waybill ─────────────────────────

  private tripDto(t: Awaited<ReturnType<TripsService['loadTrip']>>, d: Awaited<ReturnType<TripsService['approvedDriver']>>) {
    const v = d.vehicles[0];
    const net = t.fareRial - applyBp(t.fareRial, t.driverFeeBp);
    return {
      id: t.id, status: t.status, step: t.step, waybillNo: t.waybillNo, trackCode: t.trackCode,
      goods: t.goods, weight: t.weightText,
      from: { title: t.fromTitle, addr: t.fromAddr, phone: t.fromPhone, lat: t.fromLat, lng: t.fromLng },
      to: { title: t.toTitle, addr: t.toAddr, contact: t.toContact, phone: t.toPhone, lat: t.toLat, lng: t.toLng },
      notes: (t.notes as string[] | null) ?? [],
      money: { fareRial: rial(t.fareRial), netRial: rial(net), feeRial: rial(applyBp(t.fareRial, t.driverFeeBp)), feeBp: t.driverFeeBp, netWords: formatTomanWords(net), grossWords: formatTomanWords(t.fareRial), feeWords: formatTomanWords(applyBp(t.fareRial, t.driverFeeBp)) },
      waybill: {
        no: t.waybillNo, status: STATUS_LABEL[t.status], track: t.trackCode, fromTitle: t.fromTitle, fromAddr: t.fromAddr,
        distance: t.distanceKm == null ? '' : `${toFaDigits(t.distanceKm)} کیلومتر`, toTitle: t.toTitle, toAddr: t.toAddr,
        rows: [
          { k: 'کالا', v: t.goods }, ...(t.weightText ? [{ k: 'وزن', v: t.weightText }] : []), { k: 'کرایه', v: formatToman(t.fareRial) },
          { k: 'نوع پرداخت', v: 'پرداخت‌شده به حساب های مصالح — نقد نگیرید' },
        ],
        driverName: `${d.firstName} ${d.lastName}`,
        vehicle: v ? `${VEHICLE_TYPE_LABEL[v.type as VehicleType].label} ${VEHICLE_BODY_LABEL[v.body as VehicleBody]}` : '',
        plate: v ? { a: v.plate1, letter: v.plateLetter, b: v.plate2, region: v.plate3 } : { a: '', letter: '', b: '', region: '' },
        notes: (t.notes as string[] | null) ?? [],
      },
    };
  }

  private loadTrip(id: string) {
    return this.prisma.trip.findUniqueOrThrow({ where: { id } });
  }

  // ───────────────────────── dev test tool ─────────────────────────

  /** Phase 1 only (ENABLE_DEV_TOOLS): makes a paid-looking load and offers it to online approved drivers. */
  async createTestTrip(staffId: string, input: TestTripInput) {
    const feeBp = await this.settings.get('fee.driver.defaultBp');
    const ttlMin = await this.settings.get('dispatch.offerTtlMin');
    const fare = input.fareRial ?? 85_000_000n;
    const now = new Date();

    let trip;
    for (let i = 0; ; i++) {
      try {
        trip = await this.prisma.trip.create({
          data: {
            waybillNo: wayNo(now), trackCode: trackCode(), goods: input.goods ?? 'سیمان پرتلند تیپ ۲ — ۲۰۰ کیسه', weightText: input.weightText ?? '۱۰ تن',
            fromTitle: 'مصالح فروشی البرز — کرج', fromAddr: 'کرج، جاده ملارد، بعد از پل فردیس', fromPhone: '02636124500',
            toTitle: 'کارگاه پروژه ونک', toAddr: 'تهران، ونک، خیابان ملاصدرا، پلاک ۱۸', toContact: 'مهندس رضایی', toPhone: '09121112233',
            distanceKm: 42, whenText: 'امروز',
            notes: ['روی بار برزنت بکشید؛ سیمان نباید خیس شود', 'کیسه‌ها را موقع بار زدن بشمارید', 'نقد نگیرید؛ مشتری قبلاً پرداخت کرده', 'از صاحب بار امضا بگیرید و عکس بفرستید'],
            internalNote: 'بار آزمایشی', fareRial: fare, driverFeeBp: feeBp, feeSource: 'default', isTest: true,
          },
        });
        break;
      } catch (err) {
        if (i >= 5 || (err as { code?: string }).code !== 'P2002') throw err;
      }
    }
    // The "customer's payment", so settlement has money to move.
    await this.ledger.post({ kind: 'test_funding', ref: `trip:${trip.id}`, idempotencyKey: `trip:${trip.id}:fund`, lines: [{ account: 'bank:main', amountRial: -fare }, { account: `escrow:trip:${trip.id}`, amountRial: fare }] });

    const drivers = await this.prisma.driverProfile.findMany({
      where: { status: 'approved', ...(input.driverId ? { id: input.driverId } : { online: true }) }, select: { id: true, userId: true, firstName: true, city: true },
    });
    const expiresAt = new Date(now.getTime() + ttlMin * 60_000);
    for (const dr of drivers) {
      await this.prisma.dispatchOffer.create({ data: { tripId: trip.id, driverId: dr.id, fareRial: fare, driverFeeBp: feeBp, expiresAt } });
      const net = fare - applyBp(fare, feeBp);
      await this.notify.notify(dr.userId, {
        type: 'new_load', title: 'بار جدید', body: `${trip.goods} — ${formatTomanWords(net)}`, path: '/driver', channel: 'loads',
        sms: { template: 'new_load', params: { CITY: 'کرج', GOODS: trip.goods.slice(0, 25), FARE: formatTomanWords(net).replace(' تومان', '').slice(0, 25), MINUTES: toFaDigits(ttlMin) }, mode: 'newLoad' },
      });
    }
    await this.audit.log({ actorId: staffId, action: 'trip.testCreate', entity: 'trip', entityId: trip.id, after: { offered: drivers.length } });
    return { tripId: trip.id, waybillNo: trip.waybillNo, offered: drivers.length };
  }

  /** Test trips only: pays the driver from the (test) escrow and books the platform share. */
  private async settleTestTrip(tripId: string) {
    const t = await this.prisma.trip.findUniqueOrThrow({ where: { id: tripId }, include: { driver: { select: { userId: true } } } });
    if (!t.driver) return;
    const fee = applyBp(t.fareRial, t.driverFeeBp);
    await this.ledger.post({
      kind: 'trip_settlement', ref: `trip:${t.id}`, idempotencyKey: `trip:${t.id}:settle`, meta: { title: `کرایه بار ${t.goods}` },
      lines: [
        { account: `escrow:trip:${t.id}`, amountRial: -t.fareRial },
        { account: `wallet:user:${t.driver.userId}`, amountRial: t.fareRial - fee },
        { account: 'platform:revenue:fee', amountRial: fee },
      ],
    });
  }
}

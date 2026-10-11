import { z } from 'zod';
import { digitsOnly } from './digits.js';
import { mobileSchema } from './schemas.js';
import { isNationalId, PLATE_LETTERS } from './validators.js';

/** Driver registration (phase 1; design/project/driver-register.dc.html, process doc §«ثبت‌نام راننده»). */

export const VEHICLE_TYPES = ['pickup', 'khavar', 'kamyonet', 'single_truck', 'ten_wheeler', 'trailer'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];
export const VEHICLE_TYPE_LABEL: Record<VehicleType, { label: string; capacity: string }> = {
  pickup: { label: 'وانت / نیسان', capacity: 'تا ۲ تن' },
  khavar: { label: 'خاور', capacity: 'تا ۵ تن' },
  kamyonet: { label: 'کامیونت', capacity: 'تا ۸ تن' },
  single_truck: { label: 'کامیون تک', capacity: 'تا ۱۲ تن' },
  ten_wheeler: { label: 'ده‌چرخ', capacity: 'تا ۱۸ تن' },
  trailer: { label: 'تریلی', capacity: 'تا ۲۵ تن' },
};

export const VEHICLE_BODIES = ['flatbed', 'sided', 'dump', 'covered'] as const;
export type VehicleBody = (typeof VEHICLE_BODIES)[number];
export const VEHICLE_BODY_LABEL: Record<VehicleBody, string> = { flatbed: 'کفی', sided: 'بغل‌دار', dump: 'کمپرسی', covered: 'مسقف' };

export const OWNER_RELATIONS = ['father', 'mother', 'spouse', 'brother', 'sister', 'child', 'partner', 'employer', 'other'] as const;
export type OwnerRelation = (typeof OWNER_RELATIONS)[number];
export const OWNER_RELATION_LABEL: Record<OwnerRelation, string> = {
  father: 'پدر', mother: 'مادر', spouse: 'همسر', brother: 'برادر', sister: 'خواهر', child: 'فرزند',
  partner: 'شریک', employer: 'کارفرما / شرکت حمل', other: 'سایر',
};

/** First-degree relatives need only the owner's ID card; everyone else also needs an authorization document or video. */
export const FIRST_DEGREE: readonly OwnerRelation[] = ['father', 'mother', 'spouse', 'brother', 'sister', 'child'];
export const needsOwnerAuthorization = (relation: OwnerRelation) => !FIRST_DEGREE.includes(relation);

export const KYC_KINDS = [
  'national_id_front', 'national_id_back', 'vehicle_card_front', 'vehicle_card_back', 'green_sheet', 'license', 'selfie_video',
  'owner_national_id_front', 'owner_national_id_back', 'owner_authorization', 'owner_video',
] as const;
export type KycKind = (typeof KYC_KINDS)[number];

export const KYC_KIND_LABEL: Record<KycKind, string> = {
  national_id_front: 'کارت ملی (رو)', national_id_back: 'کارت ملی (پشت)',
  vehicle_card_front: 'کارت ماشین (رو)', vehicle_card_back: 'کارت ماشین (پشت)',
  green_sheet: 'برگ سبز', license: 'گواهینامه', selfie_video: 'ویدیو احراز هویت',
  owner_national_id_front: 'کارت ملی مالک (رو)', owner_national_id_back: 'کارت ملی مالک (پشت)',
  owner_authorization: 'مدرک اجازهٔ مالک', owner_video: 'ویدیو رضایت مالک',
};

export const VIDEO_KINDS: readonly KycKind[] = ['selfie_video', 'owner_video'];
export const kycSubjectOf = (kind: KycKind): 'driver' | 'owner' => (kind.startsWith('owner_') ? 'owner' : 'driver');

/**
 * The kinds that must be present before a registration can be sent. `owner_video` and `owner_authorization`
 * are alternatives for a non-first-degree owner; see `ownerProofOk`.
 */
export function requiredKinds(owner: { relation: OwnerRelation } | null): KycKind[] {
  const base: KycKind[] = ['national_id_front', 'national_id_back', 'vehicle_card_front', 'vehicle_card_back', 'green_sheet', 'selfie_video'];
  return owner ? [...base, 'owner_national_id_front', 'owner_national_id_back'] : base;
}

/**
 * Proof about a vehicle owner who is not the driver (design step 3 and 4):
 * - every different owner needs a consent video, or a link already texted to them (the video then arrives later);
 * - a non-first-degree owner also needs an authorization document, or the owner's consent video itself (not just a pending link).
 */
export function ownerProofOk(relation: OwnerRelation, have: ReadonlySet<KycKind>, videoLinkSent: boolean): boolean {
  const videoOk = have.has('owner_video') || videoLinkSent;
  const authOk = !needsOwnerAuthorization(relation) || have.has('owner_authorization') || have.has('owner_video');
  return videoOk && authOk;
}

/**
 * The fixed reasons an expert picks from when rejecting an item (owner's decision, ۱۴۰۵/۰۷/۱۹).
 * Each travels as the REASON parameter of the rejection SMS, which allows at most 25 characters.
 */
export const REJECT_REASONS = ['ناخوانا بودن', 'نامرتبط بودن', 'جعلی بودن', 'مدرک منقضی', 'تصویر قطع شده'] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

const nationalIdSchema = z
  .string()
  .transform((v) => digitsOnly(v))
  .refine(isNationalId, 'کد ملی معتبر نیست');

const nameSchema = (label: string) => z.string().trim().min(2, `${label} را کامل بنویسید`).max(40, `${label} خیلی طولانی است`);

const plateSchema = {
  plate1: z.string().transform((v) => digitsOnly(v)).pipe(z.string().regex(/^\d{2}$/, 'پلاک را کامل بنویسید')),
  plateLetter: z.enum(PLATE_LETTERS, 'حرف پلاک را انتخاب کنید'),
  plate2: z.string().transform((v) => digitsOnly(v)).pipe(z.string().regex(/^\d{3}$/, 'پلاک را کامل بنویسید')),
  plate3: z.string().transform((v) => digitsOnly(v)).pipe(z.string().regex(/^\d{2}$/, 'کد شهر پلاک را کامل بنویسید')),
};

export const vehicleOwnerInputSchema = z
  .object({
    firstName: nameSchema('نام مالک'),
    lastName: nameSchema('نام خانوادگی مالک'),
    nationalId: nationalIdSchema,
    phone: mobileSchema,
    relation: z.enum(OWNER_RELATIONS, 'نسبت با مالک را انتخاب کنید'),
    relationOther: z.string().trim().min(2).max(40).optional(),
  })
  .refine((o) => o.relation !== 'other' || !!o.relationOther, { path: ['relationOther'], message: 'نسبت را بنویسید' });

/** Everything of steps 1, 2 and 5 in one save; the wizard calls it on each «مرحله بعد». */
export const driverProfileInputSchema = z.object({
  firstName: nameSchema('نام'),
  lastName: nameSchema('نام خانوادگی'),
  nationalId: nationalIdSchema,
  licenseNo: z.string().transform((v) => digitsOnly(v)).pipe(z.string().regex(/^\d{10}$/, 'شمارهٔ گواهینامه ۱۰ رقم است')).optional(),
  refCode: z.string().trim().max(32).optional(),
  vehicle: z.object({
    type: z.enum(VEHICLE_TYPES, 'نوع خودرو را انتخاب کنید'),
    body: z.enum(VEHICLE_BODIES, 'نوع بارگیر را انتخاب کنید'),
    capacityTon: z.coerce.number().int().min(1).max(60).optional(),
    year: z.coerce.number().int().min(1300).max(1500).optional(),
    ...plateSchema,
  }),
  /** `null` when the driver owns the vehicle. */
  owner: vehicleOwnerInputSchema.nullable(),
  province: z.string().trim().min(2).max(40),
  city: z.string().trim().min(2).max(40),
  serviceCities: z.array(z.string().trim().min(2).max(40)).min(1, 'حداقل یک شهر سرویس انتخاب کنید').max(12),
  address: z.string().trim().min(6, 'نشانی را کامل بنویسید').max(300),
  postalCode: z.string().transform((v) => digitsOnly(v)).pipe(z.string().regex(/^\d{10}$/, 'کد پستی ۱۰ رقم است')).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});
export type DriverProfileInput = z.input<typeof driverProfileInputSchema>;
export type DriverProfileData = z.output<typeof driverProfileInputSchema>;

/** Attach an already-uploaded file (POST /files) to the registration. */
export const kycAttachSchema = z.object({
  kind: z.enum(KYC_KINDS, 'نوع مدرک معتبر نیست'),
  fileId: z.string().min(1),
  /** videos only: the text shown to the person to read aloud */
  scriptSnapshot: z.string().max(2000).optional(),
});
export type KycAttach = z.input<typeof kycAttachSchema>;

/** The text the driver (and a different owner) read aloud in the video, with the entered details filled in. Wording is the design's. */
export function consentScripts(d: {
  driverName: string; driverNationalId: string; plate: string;
  owner?: { name: string; nationalId: string; relation: string } | null;
}) {
  const driver = d.owner
    ? `«اینجانب ${d.driverName} با کد ملی ${d.driverNationalId}، راننده خودرو با پلاک ${d.plate} هستم که متعلق به ${d.owner.name} (${d.owner.relation}) است. با رضایت کامل مالک، متقاضی همکاری با های مصالح هستم و مسئولیت حمل و تحویل سالم بار و رعایت نکات برگ حمل را می‌پذیرم.»`
    : `«اینجانب ${d.driverName} با کد ملی ${d.driverNationalId}، مالک و راننده خودرو با پلاک ${d.plate}، متقاضی همکاری به عنوان راننده با های مصالح هستم.»`;
  const owner = d.owner
    ? `«اینجانب ${d.owner.name} با کد ملی ${d.owner.nationalId}، مالک خودرو با پلاک ${d.plate} هستم. به ${d.driverName} با کد ملی ${d.driverNationalId} (${d.owner.relation}) اجازه می‌دهم با این خودرو برای های مصالح بار حمل کند و از ثبت این اطلاعات آگاه و راضی هستم.»`
    : null;
  return { driver, owner };
}

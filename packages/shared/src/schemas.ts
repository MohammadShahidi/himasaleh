import { z } from 'zod';
import { digitsOnly } from './digits.js';
import { ROLES, SELF_SIGNUP_ROLES } from './roles.js';
import { normalizeMobile } from './validators.js';

export const mobileSchema = z
  .string()
  .transform((v, ctx) => {
    const m = normalizeMobile(v);
    if (!m) {
      ctx.addIssue({ code: 'custom', message: 'شماره موبایل معتبر نیست' });
      return z.NEVER;
    }
    return m;
  });

export const OTP_LENGTH = 5;

export const otpRequestSchema = z.object({
  phone: mobileSchema,
});
export type OtpRequest = z.input<typeof otpRequestSchema>;

export const otpVerifySchema = z.object({
  phone: mobileSchema,
  code: z
    .string()
    .transform((v) => digitsOnly(v))
    .pipe(z.string().length(OTP_LENGTH, 'کد تایید باید ۵ رقم باشد')),
  /** Role picked on the sign-in screen; used if the account holds it. */
  preferredRole: z.enum(ROLES).optional(),
  /** Present on sign-up; ignored for an existing account. */
  signup: z
    .object({
      role: z.enum(SELF_SIGNUP_ROLES, 'نوع حساب را انتخاب کنید'),
      fullName: z.string().trim().min(2, 'نام و نام خانوادگی را کامل بنویسید').max(80, 'نام خیلی طولانی است'),
      /** company name (contractor) or store name (supplier) */
      orgName: z.string().trim().min(2, 'نام شرکت یا فروشگاه را کامل بنویسید').max(120, 'نام خیلی طولانی است').optional(),
      referralCode: z.string().trim().max(32, 'کد معرف معتبر نیست').optional(),
    })
    .optional(),
});
export type OtpVerify = z.input<typeof otpVerifySchema>;

export const switchRoleSchema = z.object({ role: z.enum(ROLES, 'نقش معتبر نیست') });

export const sessionUserSchema = z.object({
  id: z.string(),
  phone: z.string(),
  fullName: z.string().nullable(),
  roles: z.array(z.enum(ROLES)),
  activeRole: z.enum(ROLES),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

/** «درخواست مشاوره» from the public site (process doc §8). */
export const consultRequestSchema = z.object({
  phone: mobileSchema,
  topic: z.string().trim().min(1, 'یک موضوع انتخاب کنید.').max(60),
  /** product name when opened from «استعلام قیمت» */
  ctx: z.string().trim().max(120).optional(),
  note: z.string().trim().max(1000, 'توضیح خیلی طولانی است').optional(),
});
export type ConsultRequest = z.input<typeof consultRequestSchema>;

export const DEFAULT_CONSULT_TOPICS = ['استعلام قیمت', 'خرید عمده پروژه', 'برآورد مصالح', 'پیگیری سفارش', 'همکاری راننده / فروشنده'];

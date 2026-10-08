import { z } from 'zod';

const bool = z.enum(['true', 'false']).transform((v) => v === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().min(1),
  /** Signs access tokens. At least 32 random characters in production. */
  JWT_SECRET: z.string().min(16),
  /** Secret mixed into OTP hashes so a database leak does not reveal codes. */
  OTP_PEPPER: z.string().min(16),
  COOKIE_SECURE: bool.default(false),
  /** Shown in SMS texts. */
  BRAND_NAME: z.string().default('های مصالح'),
  /** Domain used in the last line of the OTP SMS for Android auto-fill (WebOTP). */
  APP_DOMAIN: z.string().default('localhost'),

  SMS_PRIMARY_PROVIDER: z.enum(['fake', 'smsir']).default('fake'),
  SMS_BACKUP_PROVIDER: z.enum(['none', 'fake', 'smsir']).default('none'),
  /** sms.ir: panel → «تنظیمات» → API key. */
  SMS_IR_API_KEY: z.string().min(1).optional(),
  /** sms.ir: id of the OTP template defined under «ارسال سریع». */
  SMS_IR_OTP_TEMPLATE_ID: z.coerce.number().int().positive().optional(),
  /** Placeholder name inside that template, without #. */
  SMS_IR_OTP_PARAM: z.string().min(1).default('Code'),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET_PRIVATE: z.string().min(1),
  S3_BUCKET_PUBLIC: z.string().min(1),
  /** Base URL that serves the public bucket, e.g. https://cdn.example.com/public-bucket */
  S3_PUBLIC_BASE_URL: z.string().url(),
  S3_FORCE_PATH_STYLE: bool.default(true),
}).superRefine((e, ctx) => {
  const usesSmsIr = e.SMS_PRIMARY_PROVIDER === 'smsir' || e.SMS_BACKUP_PROVIDER === 'smsir';
  if (usesSmsIr && !e.SMS_IR_API_KEY) ctx.addIssue({ code: 'custom', path: ['SMS_IR_API_KEY'], message: 'required when sms.ir is a provider' });
  if (usesSmsIr && !e.SMS_IR_OTP_TEMPLATE_ID)
    ctx.addIssue({ code: 'custom', path: ['SMS_IR_OTP_TEMPLATE_ID'], message: 'required when sms.ir is a provider' });
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // `KEY=` in an env file means "not set", not "set to an empty string".
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== undefined && v !== ''));
  const parsed = schema.safeParse(cleaned);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid environment:\n${lines.join('\n')}`);
  }
  return parsed.data;
}

export const ENV = Symbol('ENV');

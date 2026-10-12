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
  /** sms.ir template ids of the other approved messages (docs/SMS-TEMPLATES.md). Optional: without one, that message is not sent. */
  SMS_IR_TPL_DRIVER_APPROVED: z.coerce.number().int().positive().optional(),
  SMS_IR_TPL_DRIVER_REJECTED: z.coerce.number().int().positive().optional(),
  SMS_IR_TPL_OWNER_VIDEO_REMINDER: z.coerce.number().int().positive().optional(),
  SMS_IR_TPL_DRIVER_CANCEL_WARNING: z.coerce.number().int().positive().optional(),

  SMS_IR_TPL_NEW_LOAD: z.coerce.number().int().positive().optional(),

  /** Push provider for the Android app. `fake` only logs. */
  PUSH_PROVIDER: z.enum(['fake', 'fcm']).default('fake'),
  /** Firebase service-account JSON (the whole file's content). Server only; never in the repo or the app. */
  FCM_SERVICE_ACCOUNT_JSON: z.string().min(1).optional(),

  /** Enables the test-load tool for staff (POST /dev/test-trips). Off by default; turn on only on dev and acceptance servers. */
  ENABLE_DEV_TOOLS: bool.default(false),
  /**
   * Test numbers: with ENABLE_DEV_TOOLS on, every SMS to a number starting with this prefix (e.g. 0900000) goes to an in-memory
   * test provider instead of the real one, and a tester can read it at GET /dev/test-sms. Real numbers are never affected.
   */
  SMS_TEST_PREFIX: z.string().regex(/^09\d{5,9}$/, 'digits, starting with 09, 7–11 long').optional(),
  /** Comma-separated mobiles that get the staff role at start-up (there is no staff management UI before phase 3). */
  STAFF_BOOTSTRAP_PHONES: z.string().optional(),

  /** Mobile ↔ national ID check. `manual` = the expert decides. */
  SHAHKAR_PROVIDER: z.enum(['manual', 'jibit']).default('manual'),
  /** Jibit: the full value of the Authorization header (docs/INTEGRATIONS.md). */
  JIBIT_AUTHORIZATION: z.string().min(1).optional(),

  NOMINATIM_URL: z.string().url().default('https://nominatim.openstreetmap.org'),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET_PRIVATE: z.string().min(1),
  S3_BUCKET_PUBLIC: z.string().min(1),
  /** Base URL that serves the public bucket, e.g. https://cdn.example.com/public-bucket */
  S3_PUBLIC_BASE_URL: z.string().url(),
  S3_FORCE_PATH_STYLE: bool.default(true),
  /** Create the buckets at startup (local demo only). */
  S3_AUTO_CREATE_BUCKETS: bool.default(false),
}).superRefine((e, ctx) => {
  if (e.SHAHKAR_PROVIDER === 'jibit' && !e.JIBIT_AUTHORIZATION) ctx.addIssue({ code: 'custom', path: ['JIBIT_AUTHORIZATION'], message: 'required when SHAHKAR_PROVIDER=jibit' });
  if (e.PUSH_PROVIDER === 'fcm' && !e.FCM_SERVICE_ACCOUNT_JSON) ctx.addIssue({ code: 'custom', path: ['FCM_SERVICE_ACCOUNT_JSON'], message: 'required when PUSH_PROVIDER=fcm' });
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

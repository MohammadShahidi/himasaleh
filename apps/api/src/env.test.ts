import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.js';

const base = {
  DATABASE_URL: 'postgresql://x@localhost/x', JWT_SECRET: 'x'.repeat(32), OTP_PEPPER: 'y'.repeat(32),
  S3_ENDPOINT: 'http://localhost:8333', S3_ACCESS_KEY: 'k', S3_SECRET_KEY: 's', S3_BUCKET_PRIVATE: 'a', S3_BUCKET_PUBLIC: 'b',
  S3_PUBLIC_BASE_URL: 'http://localhost:8333/b',
};

describe('loadEnv', () => {
  it('requires the sms.ir key and template when sms.ir is selected', () => {
    expect(() => loadEnv({ ...base, SMS_PRIMARY_PROVIDER: 'smsir' })).toThrow(/SMS_IR_API_KEY[\s\S]*SMS_IR_OTP_TEMPLATE_ID/);
  });
  it('treats empty values as unset', () => {
    expect(() => loadEnv({ ...base, SMS_IR_API_KEY: '', SMS_IR_OTP_TEMPLATE_ID: '' })).not.toThrow();
  });
  it('accepts a complete sms.ir configuration', () => {
    const e = loadEnv({ ...base, SMS_PRIMARY_PROVIDER: 'smsir', SMS_IR_API_KEY: 'k', SMS_IR_OTP_TEMPLATE_ID: '123456' });
    expect(e.SMS_IR_OTP_TEMPLATE_ID).toBe(123456);
    expect(e.SMS_IR_OTP_PARAM).toBe('Code');
  });
});

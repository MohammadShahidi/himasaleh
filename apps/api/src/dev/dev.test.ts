import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Env } from '../env.js';
import { loadEnv } from '../env.js';
import type { SmsProvider } from '../notifications/sms.provider.js';
import { SmsService } from '../notifications/sms.service.js';
import { StaffBootstrapService } from '../users/staff-bootstrap.service.js';
import { DevConsoleController, DevPublicController } from './dev.controller.js';

const base = { BRAND_NAME: 'های مصالح', APP_DOMAIN: 'x.ir' };

function smsSetup(extra: Partial<Env>) {
  const rows: { provider: string; to: string }[] = [];
  const prisma = { smsMessage: { create: vi.fn(async ({ data }) => rows.push(data)) } };
  const real: SmsProvider = { name: 'real', sendOtp: vi.fn(async () => ({})), send: vi.fn(async () => ({})), sendTemplate: vi.fn(async () => ({})) };
  return { svc: new SmsService([real], { ...base, ...extra } as Env, prisma as never), rows, real };
}

describe('test numbers', () => {
  const on = { ENABLE_DEV_TOOLS: true, SMS_TEST_PREFIX: '0900000' } as Partial<Env>;

  it('SMS to a test number never reaches the real provider and can be read back', async () => {
    const { svc, real, rows } = smsSetup(on);
    await svc.sendOtp('09000000001', '12345');
    expect(real.sendOtp).not.toHaveBeenCalled();
    expect(rows[0]).toMatchObject({ provider: 'test', to: '09000000001' });
    expect(svc.testMessages('09000000001')[0]).toMatchObject({ kind: 'otp', code: '12345' });
  });

  it('templated messages to a test number are readable too', async () => {
    const { svc } = smsSetup(on);
    await svc.sendTemplate('09000000002', 'driver_approved', { NAME: 'علی' });
    expect(svc.testMessages('09000000002')[0]).toMatchObject({ kind: 'driver_approved' });
  });

  it('a real number still goes to the real provider and cannot be read through the test route', async () => {
    const { svc, real } = smsSetup(on);
    await svc.sendOtp('09121234567', '99999');
    expect(real.sendOtp).toHaveBeenCalledOnce();
    expect(svc.testMessages('09121234567')).toEqual([]);
  });

  it('nothing is rerouted while the dev tools are off, even if a prefix is configured', async () => {
    const { svc, real } = smsSetup({ ENABLE_DEV_TOOLS: false, SMS_TEST_PREFIX: '0900000' });
    await svc.sendOtp('09000000001', '12345');
    expect(real.sendOtp).toHaveBeenCalledOnce();
    expect(svc.isTestNumber('09000000001')).toBe(false);
  });
});

describe('dev endpoints are closed unless the flag is on', () => {
  const off = { ENABLE_DEV_TOOLS: false } as Env;
  it('public test-sms answers 404', () => {
    const c = new DevPublicController({ isTestNumber: () => true, testMessages: () => [] } as never, off);
    expect(() => c.messages({ phone: '09000000001' })).toThrow(NotFoundException);
  });
  it('the staff console answers 404', async () => {
    const c = new DevConsoleController({} as never, {} as never, {} as never, off);
    await expect(c.state()).rejects.toBeInstanceOf(NotFoundException);
    await expect(c.expireOffers()).rejects.toBeInstanceOf(NotFoundException);
    await expect(c.resetTestData()).rejects.toBeInstanceOf(NotFoundException);
  });
  it('public test-sms is 404 for a real number even with the flag on', () => {
    const c = new DevPublicController({ isTestNumber: () => false, testMessages: () => [] } as never, { ENABLE_DEV_TOOLS: true, SMS_TEST_PREFIX: '0900000' } as Env);
    expect(() => c.messages({ phone: '09121234567' })).toThrow(NotFoundException);
  });
});

describe('test data reset', () => {
  it('refuses without a test prefix, and keeps staff accounts out of the delete', async () => {
    const noPrefix = new DevConsoleController({} as never, {} as never, {} as never, { ENABLE_DEV_TOOLS: true } as Env);
    await expect(noPrefix.resetTestData()).rejects.toMatchObject({ response: { code: 'NO_PREFIX' } });

    const findUsers = vi.fn().mockResolvedValue([{ id: 'u1' }]);
    const prisma = {
      user: { findMany: findUsers, deleteMany: vi.fn().mockResolvedValue({}) },
      driverProfile: { findMany: vi.fn().mockResolvedValue([]) }, kycItem: { findMany: vi.fn().mockResolvedValue([]) },
      trip: { deleteMany: vi.fn() }, fileObject: { deleteMany: vi.fn() }, smsMessage: { deleteMany: vi.fn() }, otpRequestLog: { deleteMany: vi.fn() },
    };
    const c = new DevConsoleController(prisma as never, {} as never, {} as never, { ENABLE_DEV_TOOLS: true, SMS_TEST_PREFIX: '0900000' } as Env);
    await expect(c.resetTestData()).resolves.toEqual({ users: 1, files: 0 });
    expect(findUsers).toHaveBeenCalledWith(expect.objectContaining({ where: { phone: { startsWith: '0900000' }, roles: { none: { role: 'staff' } } } }));
  });
});

describe('staff bootstrap', () => {
  it('gives the staff role to valid mobiles only and is idempotent (upserts)', async () => {
    const prisma = {
      user: { upsert: vi.fn(async ({ where }) => ({ id: `id-${where.phone}` })) },
      userRole: { upsert: vi.fn().mockResolvedValue({}) },
    };
    const svc = new StaffBootstrapService(prisma as never, { STAFF_BOOTSTRAP_PHONES: '09000000001, ۰۹۱۲۱۲۳۴۵۶۷ ,123,' } as Env);
    await svc.onApplicationBootstrap();
    expect(prisma.user.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.userRole.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { userId: 'id-09121234567', role: 'staff' } }));
  });

  it('does nothing when the variable is empty', async () => {
    const prisma = { user: { upsert: vi.fn() }, userRole: { upsert: vi.fn() } };
    await new StaffBootstrapService(prisma as never, {} as Env).onApplicationBootstrap();
    expect(prisma.user.upsert).not.toHaveBeenCalled();
  });
});

describe('env', () => {
  const need = { DATABASE_URL: 'postgresql://x', JWT_SECRET: 'x'.repeat(20), OTP_PEPPER: 'y'.repeat(20), S3_ENDPOINT: 'http://s3', S3_ACCESS_KEY: 'a', S3_SECRET_KEY: 'b', S3_BUCKET_PRIVATE: 'p', S3_BUCKET_PUBLIC: 'q', S3_PUBLIC_BASE_URL: 'http://s3/q' };
  it('accepts a test prefix and rejects a malformed one', () => {
    expect(loadEnv({ ...need, SMS_TEST_PREFIX: '0900000' }).SMS_TEST_PREFIX).toBe('0900000');
    expect(() => loadEnv({ ...need, SMS_TEST_PREFIX: '12' })).toThrow();
  });
});

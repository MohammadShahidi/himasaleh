import { describe, expect, it } from 'vitest';
import { generateOtp, hashOtp, otpMatches } from './otp-crypto.js';
import { looksLikeBot, phoneWaitSeconds } from './otp-policy.js';

const P = { maxPerPhone: 7, cooldownMin: 5, resendSec: 60 };
const now = new Date('2026-10-08T10:00:00Z');
/** request times `n` × `stepSec` apart, the newest `lastAgoSec` before now, newest first */
const times = (n: number, stepSec: number, lastAgoSec: number) =>
  Array.from({ length: n }, (_, i) => new Date(now.getTime() - (lastAgoSec + i * stepSec) * 1000));

describe('phoneWaitSeconds', () => {
  it('allows the first request', () => expect(phoneWaitSeconds([], now, P)).toBe(0));
  it('enforces the resend timer', () => expect(phoneWaitSeconds(times(1, 0, 20), now, P)).toBe(40));
  it('allows up to the streak limit', () => expect(phoneWaitSeconds(times(6, 61, 61), now, P)).toBe(0));
  it('makes the 8th request in a streak wait for the cooldown', () => {
    expect(phoneWaitSeconds(times(7, 61, 61), now, P)).toBe(5 * 60 - 61);
  });
  it('starts a new streak after the cooldown has passed', () => {
    expect(phoneWaitSeconds(times(7, 61, 5 * 60), now, P)).toBe(0);
  });
  it('does not count requests separated by a full cooldown as one streak', () => {
    const recent = [...times(3, 61, 61), ...times(4, 61, 61 + 2 * 61 + 6 * 60)];
    expect(phoneWaitSeconds(recent, now, P)).toBe(0);
  });
});

describe('looksLikeBot', () => {
  it('flags many distinct phones', () => {
    expect(looksLikeBot(5, { botDistinctPhones: 5 })).toBe(true);
    expect(looksLikeBot(4, { botDistinctPhones: 5 })).toBe(false);
  });
});

describe('otp crypto', () => {
  it('generates 5-digit codes', () => {
    for (let i = 0; i < 200; i++) expect(generateOtp()).toMatch(/^\d{5}$/);
  });
  it('matches only the same phone and code', () => {
    const h = hashOtp('pepper-pepper-pepper', '09123456789', '01234');
    expect(otpMatches('pepper-pepper-pepper', '09123456789', '01234', h)).toBe(true);
    expect(otpMatches('pepper-pepper-pepper', '09123456789', '01235', h)).toBe(false);
    expect(otpMatches('pepper-pepper-pepper', '09120000000', '01234', h)).toBe(false);
  });
});

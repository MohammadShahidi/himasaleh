import { describe, expect, it } from 'vitest';
import {
  applyBp, formatToman, formatTomanWords, isNationalId, isSheba, normalizeMobile,
  otpVerifySchema, toEnDigits, toFaDigits,
} from './index.js';

describe('digits', () => {
  it('round-trips Persian digits', () => {
    expect(toFaDigits(1405)).toBe('۱۴۰۵');
    expect(toEnDigits('۰۹۱۲٣٤٥')).toBe('0912345');
  });
});

describe('normalizeMobile', () => {
  it.each([
    ['09123456789', '09123456789'],
    ['۰۹۱۲ ۳۴۵ ۶۷۸۹', '09123456789'],
    ['+989123456789', '09123456789'],
    ['00989123456789', '09123456789'],
    ['9123456789', '09123456789'],
  ])('%s → %s', (i, o) => expect(normalizeMobile(i)).toBe(o));
  it.each(['0912345678', '08123456789', '', 'abc'])('rejects %s', (i) => expect(normalizeMobile(i)).toBeNull());
});

describe('isNationalId', () => {
  it('accepts valid ids', () => {
    expect(isNationalId('0012345679')).toBe(true);
    expect(isNationalId('۰۰۱۲۳۴۵۶۷۹')).toBe(true);
  });
  it('rejects bad checksum and repeated digits', () => {
    expect(isNationalId('0012345678')).toBe(false);
    expect(isNationalId('1111111111')).toBe(false);
    expect(isNationalId('123')).toBe(false);
  });
});

describe('isSheba', () => {
  it('validates mod-97', () => {
    expect(isSheba('IR062960000000100324200001')).toBe(true);
    expect(isSheba('IR062960000000100324200002')).toBe(false);
    expect(isSheba('IR06')).toBe(false);
  });
});

describe('money', () => {
  it('formats toman with Persian separators', () => {
    expect(formatToman(85_000_000n)).toBe('۸٬۵۰۰٬۰۰۰ تومان');
  });
  it('formats toman in words', () => {
    expect(formatTomanWords(78_200_000n)).toBe('۷ میلیون و ۸۲۰ هزار تومان');
    expect(formatTomanWords(17_000_000_000n)).toBe('۱ میلیارد و ۷۰۰ میلیون تومان');
    expect(formatTomanWords(0n)).toBe('۰ تومان');
  });
  it('applies basis points with half-up rounding', () => {
    expect(applyBp(85_000_000n, 800)).toBe(6_800_000n);
    expect(applyBp(1n, 5000)).toBe(1n);
    expect(applyBp(1n, 4999)).toBe(0n);
    expect(() => applyBp(1n, 1.5)).toThrow();
  });
});

describe('otpVerifySchema', () => {
  it('normalizes Persian input', () => {
    const r = otpVerifySchema.parse({ phone: '۰۹۱۲۳۴۵۶۷۸۹', code: '۱۲۳۴۵' });
    expect(r).toEqual({ phone: '09123456789', code: '12345' });
  });
  it('rejects a short code', () => {
    expect(otpVerifySchema.safeParse({ phone: '09123456789', code: '123' }).success).toBe(false);
  });
});

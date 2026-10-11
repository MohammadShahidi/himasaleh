import { describe, expect, it } from 'vitest';
import {
  applyBp, consentScripts, driverProfileInputSchema, formatToman, formatTomanWords, isNationalId, isSheba, normalizeMobile, ownerProofOk, REJECT_REASONS, requiredKinds,
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

describe('driver registration rules', () => {
  const base = {
    firstName: 'حسن', lastName: 'کریمی', nationalId: '۱۲۳۴۵۶۷۸۹۱',
    vehicle: { type: 'khavar', body: 'flatbed', plate1: '۱۲', plateLetter: 'ع', plate2: '۳۴۵', plate3: '۶۷' },
    owner: null, province: 'تهران', city: 'تهران', serviceCities: ['تهران'], address: 'تهران، خیابان آزادی، پلاک ۱',
  };

  it('accepts a complete self-owned registration and normalizes digits', () => {
    const r = driverProfileInputSchema.parse(base);
    expect(r.nationalId).toBe('1234567891');
    expect(r.vehicle.plate2).toBe('345');
  });

  it('rejects a bad national id and an incomplete plate', () => {
    expect(driverProfileInputSchema.safeParse({ ...base, nationalId: '1234567890' }).success).toBe(false);
    expect(driverProfileInputSchema.safeParse({ ...base, vehicle: { ...base.vehicle, plate2: '34' } }).success).toBe(false);
  });

  it('needs the owner details, and a written relation for «سایر»', () => {
    const owner = { firstName: 'حمید', lastName: 'کریمی', nationalId: '1234567891', phone: '09123456789', relation: 'other' };
    expect(driverProfileInputSchema.safeParse({ ...base, owner }).success).toBe(false);
    expect(driverProfileInputSchema.safeParse({ ...base, owner: { ...owner, relationOther: 'همکار' } }).success).toBe(true);
  });

  it('lists the documents a registration must have', () => {
    expect(requiredKinds(null)).not.toContain('owner_national_id_front');
    expect(requiredKinds({ relation: 'father' })).toEqual(expect.arrayContaining(['owner_national_id_front', 'owner_national_id_back']));
  });

  it('first-degree owner: a consent video or a texted link is enough', () => {
    expect(ownerProofOk('father', new Set(), false)).toBe(false);
    expect(ownerProofOk('father', new Set(), true)).toBe(true);
    expect(ownerProofOk('father', new Set(['owner_video']), false)).toBe(true);
  });

  it('other owners also need a document or the video itself, not just the link', () => {
    expect(ownerProofOk('partner', new Set(), true)).toBe(false);
    expect(ownerProofOk('partner', new Set(['owner_authorization']), true)).toBe(true);
    expect(ownerProofOk('partner', new Set(['owner_video']), false)).toBe(true);
  });

  it('keeps every rejection reason short enough for an SMS parameter', () => {
    for (const r of REJECT_REASONS) expect(r.length).toBeLessThanOrEqual(25);
  });

  it('fills the consent scripts with the entered details', () => {
    const s = consentScripts({ driverName: 'حسن کریمی', driverNationalId: '۱۲۳۴۵۶۷۸۹۱', plate: '۱۲ ع ۳۴۵ ایران ۶۷', owner: { name: 'حمید کریمی', nationalId: '۱۲۳۴۵۶۷۸۹۱', relation: 'برادر' } });
    expect(s.driver).toContain('حسن کریمی');
    expect(s.owner).toContain('حمید کریمی');
    expect(consentScripts({ driverName: 'ا', driverNationalId: '۱', plate: 'پ' }).owner).toBeNull();
  });
});

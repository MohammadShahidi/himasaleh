import { digitsOnly } from './digits.js';

/** «۰۹۱۲ ۳۴۵ ۶۷۸۹», «+989123456789», «9123456789» → «09123456789»; null if not a valid Iranian mobile. */
export function normalizeMobile(input: string): string | null {
  let d = digitsOnly(input);
  if (d.startsWith('0098')) d = d.slice(4);
  else if (d.startsWith('98') && d.length === 12) d = d.slice(2);
  if (d.length === 10 && d.startsWith('9')) d = `0${d}`;
  return /^09\d{9}$/.test(d) ? d : null;
}

/** Iranian national ID (کد ملی) checksum. */
export function isNationalId(input: string): boolean {
  const c = digitsOnly(input);
  if (!/^\d{10}$/.test(c) || /^(\d)\1{9}$/.test(c)) return false;
  const sum = c
    .slice(0, 9)
    .split('')
    .reduce((acc, d, i) => acc + Number(d) * (10 - i), 0);
  const r = sum % 11;
  const check = Number(c[9]);
  return r < 2 ? check === r : check === 11 - r;
}

/** Iranian IBAN (شبا): «IR» + 24 digits, ISO 13616 mod-97 check. */
export function isSheba(input: string): boolean {
  const s = digitsOnly(input.replace(/^\s*IR/i, ''));
  if (!/^\d{24}$/.test(s)) return false;
  // Move «IR» + check digits to the end; I=18, R=27.
  const rearranged = `${s.slice(2)}1827${s.slice(0, 2)}`;
  let rem = 0;
  for (const ch of rearranged) rem = (rem * 10 + Number(ch)) % 97;
  return rem === 1;
}

/** Persian plate letters as used on Iranian plates. */
export const PLATE_LETTERS = ['الف', 'ب', 'پ', 'ت', 'ث', 'ج', 'د', 'ز', 'س', 'ش', 'ص', 'ط', 'ع', 'ف', 'ق', 'ک', 'گ', 'ل', 'م', 'ن', 'و', 'ه', 'ی', 'D', 'S'] as const;

export interface Plate {
  /** two digits */ a: string;
  letter: (typeof PLATE_LETTERS)[number];
  /** three digits */ b: string;
  /** two-digit region code */ region: string;
}

export function isPlate(p: Plate): boolean {
  return /^\d{2}$/.test(p.a) && /^\d{3}$/.test(p.b) && /^\d{2}$/.test(p.region) && PLATE_LETTERS.includes(p.letter);
}

import { toFaDigits } from './digits.js';

/** All money is stored as integer rials (bigint). Toman exists only for display. */
export type Rial = bigint;

export const rialToToman = (rial: Rial): bigint => rial / 10n;

/** «۷٬۸۲۰٬۰۰۰ تومان» */
export function formatToman(rial: Rial): string {
  const t = rialToToman(rial).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return `${toFaDigits(t)} تومان`;
}

/**
 * «۷ میلیون و ۸۲۰ هزار تومان» — the wording used in the driver and supplier panels.
 * Rounded to the nearest thousand toman.
 */
export function formatTomanWords(rial: Rial): string {
  let t = rialToToman(rial);
  t = ((t + 500n) / 1000n) * 1000n;
  if (t === 0n) return '۰ تومان';
  const b = t / 1_000_000_000n;
  const m = (t % 1_000_000_000n) / 1_000_000n;
  const k = (t % 1_000_000n) / 1000n;
  const parts: string[] = [];
  if (b) parts.push(`${toFaDigits(b.toString())} میلیارد`);
  if (m) parts.push(`${toFaDigits(m.toString())} میلیون`);
  if (k) parts.push(`${toFaDigits(k.toString())} هزار`);
  return `${parts.join(' و ')} تومان`;
}

/** Applies a rate in basis points (150 = 1.5%), rounding half up to a whole rial. */
export function applyBp(amount: Rial, bp: number): Rial {
  if (!Number.isInteger(bp) || bp < 0) throw new RangeError(`invalid basis points: ${bp}`);
  return (amount * BigInt(bp) + 5000n) / 10000n;
}

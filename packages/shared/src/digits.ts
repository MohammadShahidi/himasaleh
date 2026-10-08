const FA = '۰۱۲۳۴۵۶۷۸۹';
const AR = '٠١٢٣٤٥٦٧٨٩';

/** Latin digits → Persian digits, for display. */
export function toFaDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => FA[Number(d)]!);
}

/** Persian or Arabic digits → Latin digits, for input normalization. */
export function toEnDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)));
}

/** Keeps only digits (after normalizing Persian/Arabic ones), optionally truncated. */
export function digitsOnly(value: string, maxLength?: number): string {
  const d = toEnDigits(value).replace(/\D/g, '');
  return maxLength === undefined ? d : d.slice(0, maxLength);
}

/** Gregorian → Jalali (Solar Hijri), the algorithm used by the common `jdf` libraries. Months are 1–12. */
export function toJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  let y = gy <= 1600 ? gy - 621 : gy - 1600;
  const y2 = gm > 2 ? y + 1 : y;
  let days = 365 * y + Math.floor((y2 + 3) / 4) - Math.floor((y2 + 99) / 100) + Math.floor((y2 + 399) / 400) - 80 + gd + cum[gm - 1]!;
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

/** Iran has no daylight saving since 2022: UTC+3:30 all year. */
const TEHRAN_OFFSET_MS = (3 * 60 + 30) * 60_000;

/** «۱۴۰۵۰۷۱۲» (Latin digits) for the calendar day in Tehran. */
export function jalaliYmd(date: Date): string {
  const t = new Date(date.getTime() + TEHRAN_OFFSET_MS);
  const [y, m, d] = toJalali(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  return `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
}

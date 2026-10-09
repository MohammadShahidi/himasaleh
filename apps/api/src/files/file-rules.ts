/** What may be uploaded, and how big (architecture §4.2 «files»). */
const MB = 1024 * 1024;

export const FILE_RULES: Record<string, number> = {
  'image/jpeg': 10 * MB,
  'image/png': 10 * MB,
  'image/webp': 10 * MB,
  'application/pdf': 10 * MB,
  // Identity videos are at most 60 s recorded on a phone.
  'video/mp4': 100 * MB,
  'video/webm': 100 * MB,
  'video/quicktime': 100 * MB,
};

export function maxBytesFor(mime: string): number | null {
  return FILE_RULES[mime] ?? null;
}

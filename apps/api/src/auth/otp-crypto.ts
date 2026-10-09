import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { OTP_LENGTH } from '@hm/shared';

export function generateOtp(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, '0');
}

export function hashOtp(pepper: string, phone: string, code: string): string {
  return createHmac('sha256', pepper).update(`${phone}:${code}`).digest('hex');
}

export function otpMatches(pepper: string, phone: string, code: string, storedHash: string): boolean {
  const a = Buffer.from(hashOtp(pepper, phone, code), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

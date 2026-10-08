/**
 * Pure decision rules for OTP requests (process doc §1), kept free of I/O so they are easy to test.
 */

export interface PhonePolicy {
  maxPerPhone: number;
  cooldownMin: number;
  resendSec: number;
}

/**
 * @param recent request times for this phone, newest first (at most `maxPerPhone` entries).
 * @returns seconds the caller must wait, or 0 if the request is allowed.
 */
export function phoneWaitSeconds(recent: Date[], now: Date, p: PhonePolicy): number {
  const newest = recent[0];
  if (!newest) return 0;
  const sinceNewest = (now.getTime() - newest.getTime()) / 1000;
  if (sinceNewest < p.resendSec) return Math.ceil(p.resendSec - sinceNewest);

  // A streak is a run of requests with no gap of a full cooldown between them.
  // After `maxPerPhone` requests in one streak, the phone waits one cooldown; then a new streak starts.
  const cooldownSec = p.cooldownMin * 60;
  if (recent.length < p.maxPerPhone || sinceNewest >= cooldownSec) return 0;
  for (let i = 0; i < p.maxPerPhone - 1; i++) {
    const gap = (recent[i]!.getTime() - recent[i + 1]!.getTime()) / 1000;
    if (gap >= cooldownSec) return 0;
  }
  return Math.ceil(cooldownSec - sinceNewest);
}

export interface BotPolicy {
  botDistinctPhones: number;
}

/** True when one IP or device asked for codes for too many different phones in the window. */
export function looksLikeBot(distinctPhonesInWindow: number, p: BotPolicy): boolean {
  return distinctPhonesInWindow >= p.botDistinctPhones;
}

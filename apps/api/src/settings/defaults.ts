import { DEFAULT_CONSULT_TOPICS } from '@hm/shared';

/**
 * Defaults for every tunable number (architecture §6). The `settings` table overrides them;
 * admins edit that table from the panel. Later phases add their keys here.
 */
export const SETTING_DEFAULTS = {
  /** Requests allowed in one uninterrupted streak per phone before a cooldown. */
  'otp.maxPerPhone': 7,
  'otp.cooldownMin': 5,
  /** Minimum seconds between two requests for the same phone (the «ارسال دوباره» timer). */
  'otp.resendSec': 60,
  'otp.maxPerIpPerHour': 20,
  'otp.maxPerDevicePerHour': 20,
  /** Distinct phones from one IP or device inside the window that count as a bot. */
  'otp.botDistinctPhones': 5,
  'otp.botWindowMin': 10,
  'otp.botBlockHours': 4,
  'otp.ttlSec': 120,
  'otp.maxAttempts': 3,

  /** Topic chips of the consultation form; admin edits them under «قوانین عملیاتی». */
  'consult.topics': DEFAULT_CONSULT_TOPICS as readonly string[],
  'consult.maxPerPhonePerHour': 3,
  'consult.maxPerIpPerHour': 20,
  'consult.slaHours': 24,
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type SettingValue<K extends SettingKey> = (typeof SETTING_DEFAULTS)[K] extends number ? number : (typeof SETTING_DEFAULTS)[K] extends readonly string[] ? string[] : (typeof SETTING_DEFAULTS)[K];

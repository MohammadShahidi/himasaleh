import { DEFAULT_CONSULT_TOPICS } from '@hm/shared';

/**
 * Defaults for every tunable number (architecture §6). The `settings` table overrides them;
 * admins edit that table from the panel. Later phases add their keys here.
 */
export const SETTING_DEFAULTS = {
  /** Requests allowed in one uninterrupted streak per phone before a cooldown. */
  /** Requests whose code was entered correctly never count toward the limits below, except the success cap. */
  'otp.maxPerPhone': 7,
  'otp.cooldownMin': 5,
  /** Minimum seconds between two requests for the same phone (the «ارسال دوباره» timer). */
  'otp.resendSec': 60,
  'otp.maxPerIpPerHour': 20,
  'otp.maxPerDevicePerHour': 20,
  /** Distinct phones from one IP or device inside the window that count as a bot. */
  /** Successful sign-ins per phone per hour; a generous guard against SMS spam from a verified number. */
  'otp.maxSuccessPerPhonePerHour': 30,
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

  /** Hours after the owner's video link was issued before the driver is reminded (once). */
  'kyc.ownerVideoReminderHours': 24,

  /**
   * SMS for a new load: `off` never, `fallback` only when the driver has no app or the push was not confirmed in time,
   * `always` together with the push. Admin edits it under «قوانین عملیاتی».
   */
  /** Platform share of the fare taken from the driver, in basis points (800 = 8%). Campaigns may lower it per driver later. */
  'fee.driver.defaultBp': 800,
  /** Minutes a load offer stays open for a driver. */
  'dispatch.offerTtlMin': 15,

  'notify.newLoadSms.mode': 'fallback' as 'off' | 'fallback' | 'always',
  /** Seconds to wait for the app to confirm a push before the fallback SMS goes (must be far below the offer's lifetime). */
  'notify.smsFallbackAfterSec': 60,

  /** Android app versions (build numbers). Below the minimum the app shows an «update» screen. */
  'app.android.minVersionCode': 1,
  'app.android.latestVersionCode': 1,
  'app.android.storeUrl': '' as string,
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type SettingValue<K extends SettingKey> = (typeof SETTING_DEFAULTS)[K] extends number ? number : (typeof SETTING_DEFAULTS)[K] extends readonly string[] ? string[] : (typeof SETTING_DEFAULTS)[K];

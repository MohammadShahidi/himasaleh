/**
 * Approved sms.ir templates (docs/SMS-TEMPLATES.md). The text lives in the sms.ir panel; here we only know which
 * parameters each one takes. Parameter values are at most 25 characters (checked by the provider).
 */
export const SMS_TEMPLATE_PARAMS = {
  /** «#NAME# عزیز، مدارک شما تایید شد و حساب راننده‌تان فعال است.» */
  driver_approved: ['NAME'],
  /** «#NAME# عزیز، مدرک «#DOC#» شما تایید نشد. علت: #REASON#» */
  driver_rejected: ['NAME', 'DOC', 'REASON'],
  /** Sent to the driver 24 h after the owner link was issued and no consent video arrived. */
  owner_video_reminder: ['NAME'],
  /** More than 3 cancellations after accepting a load in one day. */
  driver_cancel_warning: ['NAME'],
} as const;

export type SmsTemplateKey = keyof typeof SMS_TEMPLATE_PARAMS;
export type SmsTemplateParams<K extends SmsTemplateKey> = Record<(typeof SMS_TEMPLATE_PARAMS)[K][number], string>;

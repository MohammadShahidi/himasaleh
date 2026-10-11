import { Global, Module } from '@nestjs/common';
import { ENV, type Env } from '../env.js';
import { FakeSmsProvider, type SmsProvider } from './sms.provider.js';
import { SMS_PROVIDERS, SmsService } from './sms.service.js';
import { SmsIrProvider } from './smsir.provider.js';

function build(kind: string, label: string, env: Env): SmsProvider | null {
  if (kind === 'fake') return new FakeSmsProvider(label);
  if (kind === 'smsir')
    return new SmsIrProvider(label, {
      apiKey: env.SMS_IR_API_KEY!,
      otpTemplateId: env.SMS_IR_OTP_TEMPLATE_ID!,
      otpParam: env.SMS_IR_OTP_PARAM,
      templates: {
        ...(env.SMS_IR_TPL_DRIVER_APPROVED ? { driver_approved: env.SMS_IR_TPL_DRIVER_APPROVED } : {}),
        ...(env.SMS_IR_TPL_DRIVER_REJECTED ? { driver_rejected: env.SMS_IR_TPL_DRIVER_REJECTED } : {}),
        ...(env.SMS_IR_TPL_OWNER_VIDEO_REMINDER ? { owner_video_reminder: env.SMS_IR_TPL_OWNER_VIDEO_REMINDER } : {}),
        ...(env.SMS_IR_TPL_DRIVER_CANCEL_WARNING ? { driver_cancel_warning: env.SMS_IR_TPL_DRIVER_CANCEL_WARNING } : {}),
      },
    });
  return null;
}

@Global()
@Module({
  providers: [
    {
      provide: SMS_PROVIDERS,
      inject: [ENV],
      useFactory: (env: Env) =>
        [build(env.SMS_PRIMARY_PROVIDER, 'primary', env), build(env.SMS_BACKUP_PROVIDER, 'backup', env)].filter(
          (p): p is SmsProvider => p !== null,
        ),
    },
    SmsService,
  ],
  exports: [SmsService],
})
export class NotificationsModule {}

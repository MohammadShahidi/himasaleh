import { Global, Module } from '@nestjs/common';
import { ENV, type Env } from '../env.js';
import { FakeSmsProvider, type SmsProvider } from './sms.provider.js';
import { SMS_PROVIDERS, SmsService } from './sms.service.js';

function build(kind: string, label: string): SmsProvider | null {
  if (kind === 'fake') return new FakeSmsProvider(label);
  return null;
}

@Global()
@Module({
  providers: [
    {
      provide: SMS_PROVIDERS,
      inject: [ENV],
      useFactory: (env: Env) =>
        [build(env.SMS_PRIMARY_PROVIDER, 'primary'), build(env.SMS_BACKUP_PROVIDER, 'backup')].filter(
          (p): p is SmsProvider => p !== null,
        ),
    },
    SmsService,
  ],
  exports: [SmsService],
})
export class NotificationsModule {}

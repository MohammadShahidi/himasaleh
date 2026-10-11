import { Global, Module } from '@nestjs/common';
import { ENV, type Env } from '../env.js';
import { IdentityService, SHAHKAR_PROVIDER } from './identity.service.js';
import { JibitShahkarProvider, type ShahkarProvider } from './shahkar.provider.js';

@Global()
@Module({
  providers: [
    {
      provide: SHAHKAR_PROVIDER,
      inject: [ENV],
      useFactory: (env: Env): ShahkarProvider | null => (env.SHAHKAR_PROVIDER === 'jibit' ? new JibitShahkarProvider(env.JIBIT_AUTHORIZATION!) : null),
    },
    IdentityService,
  ],
  exports: [IdentityService],
})
export class IdentityModule {}

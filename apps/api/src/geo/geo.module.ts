import { Module } from '@nestjs/common';
import { ENV, type Env } from '../env.js';
import { GeoController } from './geo.controller.js';
import { GEO_PROVIDER, NominatimProvider } from './geo.provider.js';

@Module({
  controllers: [GeoController],
  providers: [
    {
      provide: GEO_PROVIDER,
      inject: [ENV],
      useFactory: (env: Env) => new NominatimProvider(env.NOMINATIM_URL, `himasaleh/1.0 (${env.APP_DOMAIN})`),
    },
  ],
})
export class GeoModule {}

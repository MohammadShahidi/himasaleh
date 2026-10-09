import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ConfigModule } from './config.module.js';
import { ConsultModule } from './consult/consult.module.js';
import { FilesModule } from './files/files.module.js';
import { GeoModule } from './geo/geo.module.js';
import { HealthController } from './health/health.controller.js';
import { JobsModule } from './jobs/jobs.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SettingsModule } from './settings/settings.module.js';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
        redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
        transport: process.env['NODE_ENV'] === 'production' ? undefined : { target: 'pino-pretty' },
      },
    }),
    ConfigModule,
    PrismaModule,
    AuditModule,
    SettingsModule,
    JobsModule,
    NotificationsModule,
    AuthModule,
    FilesModule,
    ConsultModule,
    GeoModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

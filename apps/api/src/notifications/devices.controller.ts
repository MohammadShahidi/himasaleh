import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, Public } from '../auth/decorators.js';
import type { AuthUser } from '../common/request.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { SettingsService } from '../settings/settings.service.js';
import { NotifyService } from './notify.service.js';

const deviceSchema = z.object({ token: z.string().min(20).max(400), appVersion: z.string().max(20).optional() });
const tokenSchema = deviceSchema.pick({ token: true });
const configQuery = z.object({ platform: z.literal('android').default('android'), versionCode: z.coerce.number().int().min(0).default(0) });

/** The Android app registers its FCM token after sign-in and confirms each push it receives. */
@Controller()
export class DevicesController {
  constructor(
    private readonly notify: NotifyService,
    private readonly settings: SettingsService,
  ) {}

  @Post('devices')
  @HttpCode(HttpStatus.NO_CONTENT)
  async register(@Body(new ZodPipe(deviceSchema)) body: z.output<typeof deviceSchema>, @CurrentUser() user: AuthUser) {
    await this.notify.registerDevice(user.id, body.token, body.appVersion);
  }

  @Delete('devices')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unregister(@Body(new ZodPipe(tokenSchema)) body: z.output<typeof tokenSchema>, @CurrentUser() user: AuthUser) {
    await this.notify.unregisterDevice(user.id, body.token);
  }

  @Post('notifications/:id/ack')
  @HttpCode(HttpStatus.NO_CONTENT)
  async ack(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.notify.ack(user.id, id);
  }

  /** Public so the «update» screen works before sign-in. */
  @Public()
  @Get('app/config')
  async appConfig(@Query(new ZodPipe(configQuery)) q: z.output<typeof configQuery>) {
    const s = await this.settings.getMany(['app.android.minVersionCode', 'app.android.latestVersionCode', 'app.android.storeUrl'] as const);
    return {
      updateRequired: q.versionCode < s['app.android.minVersionCode'],
      updateAvailable: q.versionCode < s['app.android.latestVersionCode'],
      storeUrl: s['app.android.storeUrl'],
    };
  }
}

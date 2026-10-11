import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put, Req } from '@nestjs/common';
import { driverProfileInputSchema, kycAttachSchema } from '@hm/shared';
import type { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { type AppRequest, type AuthUser, ipOf } from '../common/request.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { DriversService } from './drivers.service.js';

/** The caller's own driver registration (phase 1). */
@Controller('drivers/me')
@Roles('driver')
export class DriversController {
  constructor(private readonly drivers: DriversService) {}

  @Get()
  me(@CurrentUser() user: AuthUser) {
    return this.drivers.me(user.id);
  }

  /** Steps 1, 2 and 5 together; the wizard calls it on every «مرحله بعد». */
  @Put()
  save(@Body(new ZodPipe(driverProfileInputSchema)) body: z.output<typeof driverProfileInputSchema>, @CurrentUser() user: AuthUser, @Req() req: AppRequest) {
    return this.drivers.save(user.id, body, ipOf(req));
  }

  @Post('kyc')
  @HttpCode(HttpStatus.CREATED)
  attach(@Body(new ZodPipe(kycAttachSchema)) body: z.output<typeof kycAttachSchema>, @CurrentUser() user: AuthUser) {
    return this.drivers.attach(user.id, body);
  }

  /** The link the owner opens to record the consent video; the driver copies and forwards it. */
  @Post('owner/video-link')
  @HttpCode(HttpStatus.OK)
  ownerVideoLink(@CurrentUser() user: AuthUser, @Req() req: AppRequest) {
    return this.drivers.ownerVideoLink(user.id, ipOf(req));
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  submit(@CurrentUser() user: AuthUser, @Req() req: AppRequest) {
    return this.drivers.submit(user.id, ipOf(req));
  }
}

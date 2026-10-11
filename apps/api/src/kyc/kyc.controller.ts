import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req } from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { type AppRequest, type AuthUser, ipOf } from '../common/request.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { KycService, type ReviewItem, reviewItemSchema } from './kyc.service.js';

/** Expert review queue (staff). Documents themselves are opened with GET /files/:id/url, which audits every staff view. */
@Controller('kyc')
@Roles('staff')
export class KycController {
  constructor(private readonly kyc: KycService) {}

  @Get('queue')
  queue() {
    return this.kyc.queue();
  }

  @Get('drivers/:id')
  detail(@Param('id') id: string) {
    return this.kyc.detail(id);
  }

  @Post('items/:id/review')
  @HttpCode(HttpStatus.OK)
  review(@Param('id') id: string, @Body(new ZodPipe(reviewItemSchema)) body: ReviewItem, @CurrentUser() user: AuthUser, @Req() req: AppRequest) {
    return this.kyc.reviewItem(user.id, id, body, ipOf(req));
  }

  @Post('drivers/:id/finish')
  @HttpCode(HttpStatus.OK)
  finish(@Param('id') id: string, @CurrentUser() user: AuthUser, @Req() req: AppRequest) {
    return this.kyc.finish(user.id, id, ipOf(req));
  }
}

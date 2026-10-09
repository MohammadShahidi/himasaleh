import { Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { z } from 'zod';
import { type AppRequest, type AuthUser, ipOf } from '../common/request.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { CurrentUser } from '../auth/decorators.js';
import { FilesService } from './files.service.js';

const visibilitySchema = z.enum(['private', 'public']).default('private');

@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  /** multipart/form-data with one file field. Public uploads are for staff (product images). */
  @Post()
  upload(
    @Query('visibility', new ZodPipe(visibilitySchema)) visibility: 'private' | 'public',
    @Req() req: AppRequest,
    @CurrentUser() user: AuthUser,
  ) {
    return this.files.upload(req, user.id, user.role === 'staff' ? visibility : 'private');
  }

  @Get(':id/url')
  url(@Param('id') id: string, @CurrentUser() user: AuthUser, @Req() req: AppRequest) {
    return this.files.url(id, user, ipOf(req));
  }
}

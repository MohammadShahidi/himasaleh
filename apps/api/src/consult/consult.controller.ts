import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { consultRequestSchema } from '@hm/shared';
import type { z } from 'zod';
import { Public } from '../auth/decorators.js';
import { AppError } from '../common/errors.js';
import { type AppRequest, ipOf } from '../common/request.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';

const HOUR = 3600_000;

@Controller('consult')
export class ConsultController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  @Public()
  @Get('topics')
  async topics() {
    return { topics: await this.settings.get('consult.topics'), slaHours: await this.settings.get('consult.slaHours') };
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body(new ZodPipe(consultRequestSchema)) body: z.output<typeof consultRequestSchema>, @Req() req: AppRequest) {
    const ip = ipOf(req);
    const since = new Date(Date.now() - HOUR);
    const s = await this.settings.getMany(['consult.maxPerPhonePerHour', 'consult.maxPerIpPerHour'] as const);
    if (
      (await this.prisma.consultRequest.count({ where: { phone: body.phone, createdAt: { gte: since } } })) >= s['consult.maxPerPhonePerHour'] ||
      (await this.prisma.consultRequest.count({ where: { ip, createdAt: { gte: since } } })) >= s['consult.maxPerIpPerHour']
    )
      throw new AppError(HttpStatus.TOO_MANY_REQUESTS, 'CONSULT_RATE_LIMIT', 'درخواست شما قبلاً ثبت شده است. کارشناس به‌زودی تماس می‌گیرد.');

    const row = await this.prisma.consultRequest.create({
      data: { phone: body.phone, topic: body.topic, ctx: body.ctx ?? null, note: body.note ?? null, ip },
    });
    return { id: row.id };
  }
}

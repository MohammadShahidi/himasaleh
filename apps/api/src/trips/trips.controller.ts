import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, Patch, Post, Put, Req } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, Roles } from '../auth/decorators.js';
import { type AppRequest, type AuthUser, ipOf } from '../common/request.js';
import { ZodPipe } from '../common/zod.pipe.js';
import { ENV, type Env } from '../env.js';
import { DriversService } from '../drivers/drivers.service.js';
import { TripsService } from './trips.service.js';

const statusSchema = z.object({ online: z.boolean() });
const locationSchema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), address: z.string().trim().max(300).optional() });
const progressSchema = z.object({
  step: z.number().int().min(1).max(4),
  events: z.array(z.object({
    step: z.number().int().min(1).max(4),
    at: z.string().datetime(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    photoFileId: z.string().min(1).optional(),
  })).max(8),
  clientSeq: z.number().int().optional(),
});
const testTripSchema = z.object({
  goods: z.string().trim().min(2).max(120).optional(),
  weightText: z.string().trim().max(40).optional(),
  fareToman: z.number().int().min(100_000).max(500_000_000).optional(),
  driverId: z.string().optional(),
});

/** The driver panel's data (phase 1). Only an approved driver gets past the service's checks. */
@Controller('driver')
@Roles('driver')
export class DriverPanelController {
  constructor(
    private readonly trips: TripsService,
    private readonly drivers: DriversService,
  ) {}

  @Put('location')
  location(@Body(new ZodPipe(locationSchema)) body: z.output<typeof locationSchema>, @CurrentUser() user: AuthUser) {
    return this.drivers.updateLocation(user.id, body);
  }

  /** «سر کارم» / «استراحت» */
  @Put('status')
  status(@Body(new ZodPipe(statusSchema)) body: z.output<typeof statusSchema>, @CurrentUser() user: AuthUser) {
    return this.trips.setOnline(user.id, body.online);
  }

  @Get('offers')
  offers(@CurrentUser() user: AuthUser) {
    return this.trips.offers(user.id);
  }

  @Post('offers/:id/accept')
  @HttpCode(HttpStatus.OK)
  accept(@Param('id') id: string, @CurrentUser() user: AuthUser, @Req() req: AppRequest) {
    return this.trips.accept(user.id, id, ipOf(req));
  }

  @Post('offers/:id/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reject(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.trips.reject(user.id, id);
  }

  @Get('trip')
  current(@CurrentUser() user: AuthUser) {
    return this.trips.current(user.id).then((trip) => ({ trip }));
  }

  @Get('wallet')
  wallet(@CurrentUser() user: AuthUser) {
    return this.trips.wallet(user.id);
  }
}

@Controller('trips')
@Roles('driver')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  /** One request with every step finished so far; works after being offline and is safe to repeat (ARCHITECTURE §3.6). */
  @Patch(':id/progress')
  progress(@Param('id') id: string, @Body(new ZodPipe(progressSchema)) body: z.output<typeof progressSchema>, @CurrentUser() user: AuthUser, @Req() req: AppRequest) {
    return this.trips.progress(user.id, id, body, ipOf(req));
  }
}

/** Test-load tool. Answers 404 unless ENABLE_DEV_TOOLS is on. */
@Controller('dev')
@Roles('staff')
export class DevToolsController {
  constructor(
    private readonly trips: TripsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Post('test-trips')
  @HttpCode(HttpStatus.CREATED)
  async testTrip(@Body(new ZodPipe(testTripSchema)) body: z.output<typeof testTripSchema>, @CurrentUser() user: AuthUser) {
    if (!this.env.ENABLE_DEV_TOOLS) throw new NotFoundException();
    return this.trips.createTestTrip(user.id, { goods: body.goods, weightText: body.weightText, fareRial: body.fareToman === undefined ? undefined : BigInt(body.fareToman) * 10n, driverId: body.driverId });
  }
}

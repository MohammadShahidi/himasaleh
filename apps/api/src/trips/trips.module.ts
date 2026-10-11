import { Module } from '@nestjs/common';
import { DriversModule } from '../drivers/drivers.module.js';
import { DevToolsController, DriverPanelController, TripsController } from './trips.controller.js';
import { TripsService } from './trips.service.js';

@Module({ imports: [DriversModule], controllers: [DriverPanelController, TripsController, DevToolsController], providers: [TripsService], exports: [TripsService] })
export class TripsModule {}

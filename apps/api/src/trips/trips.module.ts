import { Module } from '@nestjs/common';
import { DevToolsController, DriverPanelController, TripsController } from './trips.controller.js';
import { TripsService } from './trips.service.js';

@Module({ controllers: [DriverPanelController, TripsController, DevToolsController], providers: [TripsService], exports: [TripsService] })
export class TripsModule {}

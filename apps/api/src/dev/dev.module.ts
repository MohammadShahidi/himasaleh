import { Module } from '@nestjs/common';
import { KycModule } from '../kyc/kyc.module.js';
import { DevConsoleController, DevPublicController } from './dev.controller.js';

@Module({ imports: [KycModule], controllers: [DevPublicController, DevConsoleController] })
export class DevModule {}

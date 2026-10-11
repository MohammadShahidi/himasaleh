import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module.js';
import { KycController } from './kyc.controller.js';
import { OwnerVideoController } from './owner-video.controller.js';
import { KycService } from './kyc.service.js';

@Module({ imports: [FilesModule], controllers: [KycController, OwnerVideoController], providers: [KycService], exports: [KycService] })
export class KycModule {}

import { Module } from '@nestjs/common';
import { ConsultController } from './consult.controller.js';

@Module({ controllers: [ConsultController] })
export class ConsultModule {}

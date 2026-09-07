import { Module } from '@nestjs/common';
import { SwapsService } from './swaps.service.js';
import { SwapsController } from './swaps.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { ScheduleWindowsModule } from '../schedule-windows/schedule-windows.module.js';

@Module({
  imports: [AuthModule, ScheduleWindowsModule],
  controllers: [SwapsController],
  providers: [SwapsService],
  exports: [SwapsService],
})
export class SwapsModule {}

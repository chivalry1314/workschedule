import { Module } from '@nestjs/common';
import { ScheduleWindowsService } from './schedule-windows.service.js';
import { ScheduleWindowsController } from './schedule-windows.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [ScheduleWindowsController],
  providers: [ScheduleWindowsService],
  exports: [ScheduleWindowsService],
})
export class ScheduleWindowsModule {}

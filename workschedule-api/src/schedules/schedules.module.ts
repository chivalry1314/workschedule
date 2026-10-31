import { Module } from '@nestjs/common';
import { SchedulesService } from './schedules.service.js';
import { SchedulesController } from './schedules.controller.js';
import { AuthModule } from '../auth/auth.module.js';
import { ScheduleWindowsModule } from '../schedule-windows/schedule-windows.module.js';
import { ScheduleTemplatesModule } from '../schedule-templates/schedule-templates.module.js';

@Module({
  imports: [
    AuthModule,
    ScheduleWindowsModule,
    ScheduleTemplatesModule,
  ],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}



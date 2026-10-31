import { Module, forwardRef } from '@nestjs/common';
import { ScheduleStatisticsService } from './schedule-statistics.service.js';
import { ScheduleStatisticsController } from './schedule-statistics.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [ScheduleStatisticsController],
  providers: [ScheduleStatisticsService],
  exports: [ScheduleStatisticsService],
})
export class ScheduleStatisticsModule {}

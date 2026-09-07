import { Module } from '@nestjs/common';
import { ScheduleRulesService } from './schedule-rules.service.js';
import { ScheduleRulesController } from './schedule-rules.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [ScheduleRulesController],
  providers: [ScheduleRulesService],
  exports: [ScheduleRulesService],
})
export class ScheduleRulesModule {}

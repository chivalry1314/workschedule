import { Module, forwardRef } from '@nestjs/common';
import { ScheduleTemplatesService } from './schedule-templates.service.js';
import { ScheduleTemplatesController } from './schedule-templates.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [ScheduleTemplatesController],
  providers: [ScheduleTemplatesService],
  exports: [ScheduleTemplatesService],
})
export class ScheduleTemplatesModule {}

import { Controller, Get, Put, Body, Query, UseGuards } from '@nestjs/common';
import { ScheduleRulesService } from './schedule-rules.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';

@Controller('schedule-rules')
@UseGuards(JwtAuthGuard)
export class ScheduleRulesController {
  constructor(private scheduleRulesService: ScheduleRulesService) {}

  @Get()
  findAll(@Query('monthKey') monthKey?: string) {
    return this.scheduleRulesService.findAll(monthKey);
  }

  @Put()
  @UseGuards(AdminGuard)
  replaceAll(
    @Body() body: { monthKey: string; rules: { ruleType: number; shiftTypeId: number; maxCount: number }[] },
  ) {
    return this.scheduleRulesService.replaceAll(body?.monthKey, body?.rules ?? []);
  }
}

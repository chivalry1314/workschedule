import { Controller, Get, Put, Body, Query, UseGuards } from '@nestjs/common';
import { ScheduleWindowsService } from './schedule-windows.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';

@Controller('schedule-windows')
@UseGuards(JwtAuthGuard)
export class ScheduleWindowsController {
  constructor(private scheduleWindowsService: ScheduleWindowsService) {}

  @Get()
  findByMonth(@Query('monthKey') monthKey: string) {
    return this.scheduleWindowsService.findByMonth(monthKey);
  }

  @Put()
  @UseGuards(AdminGuard)
  upsert(@Body() body: { monthKey: string; startAt?: string; endAt?: string }) {
    return this.scheduleWindowsService.upsert(body);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ScheduleStatisticsService } from './schedule-statistics.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';

@Controller('schedule-statistics')
@UseGuards(JwtAuthGuard)
export class ScheduleStatisticsController {
  constructor(private scheduleStatisticsService: ScheduleStatisticsService) {}

  @Get()
  getStatistics(
    @Query('startMonth') startMonth?: string,
    @Query('endMonth') endMonth?: string,
  ) {
    return this.scheduleStatisticsService.getStatistics({ startMonth, endMonth });
  }

  @Get('start-month')
  @UseGuards(AdminGuard)
  getStartMonth() {
    return this.scheduleStatisticsService.getStartMonth();
  }

  @Post('start-month')
  @UseGuards(AdminGuard)
  setStartMonth(@Body('startMonth') startMonth: string) {
    return this.scheduleStatisticsService.setStartMonth(startMonth);
  }

  @Get('end-month')
  @UseGuards(AdminGuard)
  getEndMonth() {
    return this.scheduleStatisticsService.getEndMonth();
  }

  @Post('end-month')
  @UseGuards(AdminGuard)
  setEndMonth(@Body('endMonth') endMonth: string) {
    return this.scheduleStatisticsService.setEndMonth(endMonth);
  }
}

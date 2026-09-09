import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { SaveScheduleDto } from './dto/save-schedule.dto.js';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(private schedulesService: SchedulesService) {}

  @Get('mine')
  getMySchedules(
    @CurrentUser('sub') userId: bigint,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.schedulesService.getMySchedules(userId, +year, +month);
  }

  @Post('mine')
  saveMySchedules(
    @CurrentUser('sub') userId: bigint,
    @Body() dto: SaveScheduleDto,
  ) {
    return this.schedulesService.saveMySchedules(userId, dto);
  }

  @Post('mine/submit')
  submitMySchedules(
    @CurrentUser('sub') userId: bigint,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.schedulesService.submitMySchedules(userId, +year, +month);
  }

  @Get('all')
  getAllSchedules(
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('roleId') roleId?: string,
    @Query('shiftTypeId') shiftTypeId?: string,
  ) {
    return this.schedulesService.getAllSchedules(+year, +month, {
      roleId: roleId ? BigInt(roleId) : undefined,
      shiftTypeId: shiftTypeId ? BigInt(shiftTypeId) : undefined,
    });
  }

  @Get('users/:userId')
  getUserSchedules(
    @Param('userId') userId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.schedulesService.getMySchedules(BigInt(userId), +year, +month);
  }

  @Put('users/:userId')
  @UseGuards(AdminGuard)
  adminSaveUserSchedules(
    @Param('userId') userId: string,
    @Body() dto: SaveScheduleDto,
  ) {
    return this.schedulesService.adminSaveUserSchedules(BigInt(userId), dto);
  }

  @Post('users/:userId/clear')
  @UseGuards(AdminGuard)
  clearUserSchedules(
    @Param('userId') userId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.schedulesService.clearUserSchedules(BigInt(userId), +year, +month);
  }

  @Post(':id/lock')
  @UseGuards(AdminGuard)
  lockMonth(
    @Param('id') id: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.schedulesService.lockMonth(BigInt(id), +year, +month);
  }

  @Post(':id/unlock')
  @UseGuards(AdminGuard)
  unlockMonth(
    @Param('id') id: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.schedulesService.unlockMonth(BigInt(id), +year, +month);
  }

  @Post(':id/reject')
  @UseGuards(AdminGuard)
  rejectMonth(
    @Param('id') id: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.schedulesService.rejectMonth(BigInt(id), +year, +month);
  }
}

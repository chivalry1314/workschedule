import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ScheduleTemplatesService } from './schedule-templates.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { CreateScheduleTemplateDto } from './dto/create-schedule-template.dto.js';
import { UpdateScheduleTemplateDto } from './dto/update-schedule-template.dto.js';

@Controller('schedule-templates')
@UseGuards(JwtAuthGuard)
export class ScheduleTemplatesController {
  constructor(private scheduleTemplatesService: ScheduleTemplatesService) {}

  @Get()
  @UseGuards(AdminGuard)
  findAll(
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
  ) {
    return this.scheduleTemplatesService.findAll({
      keyword,
      status: status !== undefined ? Number(status) : undefined,
    });
  }

  @Get('active')
  @UseGuards(AdminGuard)
  findActive() {
    return this.scheduleTemplatesService.findActiveTemplates();
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() dto: CreateScheduleTemplateDto) {
    return this.scheduleTemplatesService.create(dto);
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  findOne(@Param('id') id: string) {
    return this.scheduleTemplatesService.findOne(BigInt(id));
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleTemplateDto,
  ) {
    return this.scheduleTemplatesService.update(BigInt(id), dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.scheduleTemplatesService.remove(BigInt(id));
  }
}

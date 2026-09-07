import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ShiftTypesService } from './shift-types.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { CreateShiftTypeDto } from './dto/create-shift-type.dto.js';
import { UpdateShiftTypeDto } from './dto/update-shift-type.dto.js';

@Controller('shift-types')
@UseGuards(JwtAuthGuard)
export class ShiftTypesController {
  constructor(private shiftTypesService: ShiftTypesService) {}

  @Get()
  findAll() {
    return this.shiftTypesService.findAll();
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() dto: CreateShiftTypeDto) {
    return this.shiftTypesService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shiftTypesService.findOne(BigInt(id));
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  update(@Param('id') id: string, @Body() dto: UpdateShiftTypeDto) {
    return this.shiftTypesService.update(BigInt(id), dto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.shiftTypesService.remove(BigInt(id));
  }

  @Patch(':id/status')
  @UseGuards(AdminGuard)
  toggleStatus(@Param('id') id: string) {
    return this.shiftTypesService.toggleStatus(BigInt(id));
  }
}

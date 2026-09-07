import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SwapsService } from './swaps.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CreateSwapDto } from './dto/create-swap.dto.js';

@Controller('swaps')
@UseGuards(JwtAuthGuard)
export class SwapsController {
  constructor(private swapsService: SwapsService) {}

  @Get()
  findByUser(@CurrentUser('sub') userId: bigint) {
    return this.swapsService.findByUser(userId);
  }

  @Post()
  create(@CurrentUser('sub') userId: bigint, @Body() dto: CreateSwapDto) {
    return this.swapsService.create(userId, dto);
  }

  @Post(':id/approve')
  approve(
    @CurrentUser('sub') userId: bigint,
    @Param('id') id: string,
  ) {
    return this.swapsService.approve(BigInt(id), userId);
  }

  @Post(':id/reject')
  reject(
    @CurrentUser('sub') userId: bigint,
    @Param('id') id: string,
  ) {
    return this.swapsService.reject(BigInt(id), userId);
  }

  @Post(':id/withdraw')
  withdraw(
    @CurrentUser('sub') userId: bigint,
    @Param('id') id: string,
  ) {
    return this.swapsService.withdraw(BigInt(id), userId);
  }

  @Post(':id/admin-approve')
  @UseGuards(AdminGuard)
  adminApprove(
    @CurrentUser('sub') adminId: bigint,
    @Param('id') id: string,
  ) {
    return this.swapsService.adminApprove(BigInt(id), adminId, true);
  }

  @Post(':id/admin-reject')
  @UseGuards(AdminGuard)
  adminReject(
    @CurrentUser('sub') adminId: bigint,
    @Param('id') id: string,
  ) {
    return this.swapsService.adminApprove(BigInt(id), adminId, false);
  }
}

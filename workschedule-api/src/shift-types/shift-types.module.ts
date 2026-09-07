import { Module } from '@nestjs/common';
import { ShiftTypesService } from './shift-types.service.js';
import { ShiftTypesController } from './shift-types.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [ShiftTypesController],
  providers: [ShiftTypesService],
  exports: [ShiftTypesService],
})
export class ShiftTypesModule {}

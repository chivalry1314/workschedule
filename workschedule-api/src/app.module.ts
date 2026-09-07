import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { CloudBaseModule } from './cloudbase/cloudbase.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { RolesModule } from './roles/roles.module.js';
import { ShiftTypesModule } from './shift-types/shift-types.module.js';
import { SchedulesModule } from './schedules/schedules.module.js';
import { SwapsModule } from './swaps/swaps.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { ScheduleRulesModule } from './schedule-rules/schedule-rules.module.js';
import { ScheduleWindowsModule } from './schedule-windows/schedule-windows.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CloudBaseModule,
    AuthModule,
    UsersModule,
    RolesModule,
    ShiftTypesModule,
    SchedulesModule,
    SwapsModule,
    SettingsModule,
    ScheduleRulesModule,
    ScheduleWindowsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

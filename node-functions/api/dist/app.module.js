var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({
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
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map
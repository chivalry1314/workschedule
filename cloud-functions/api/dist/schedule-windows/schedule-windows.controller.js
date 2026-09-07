var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Get, Put, Body, Query, UseGuards } from '@nestjs/common';
import { ScheduleWindowsService } from './schedule-windows.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
let ScheduleWindowsController = class ScheduleWindowsController {
    scheduleWindowsService;
    constructor(scheduleWindowsService) {
        this.scheduleWindowsService = scheduleWindowsService;
    }
    findByMonth(monthKey) {
        return this.scheduleWindowsService.findByMonth(monthKey);
    }
    upsert(body) {
        return this.scheduleWindowsService.upsert(body);
    }
};
__decorate([
    Get(),
    __param(0, Query('monthKey')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ScheduleWindowsController.prototype, "findByMonth", null);
__decorate([
    Put(),
    UseGuards(AdminGuard),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ScheduleWindowsController.prototype, "upsert", null);
ScheduleWindowsController = __decorate([
    Controller('schedule-windows'),
    UseGuards(JwtAuthGuard),
    __metadata("design:paramtypes", [ScheduleWindowsService])
], ScheduleWindowsController);
export { ScheduleWindowsController };
//# sourceMappingURL=schedule-windows.controller.js.map
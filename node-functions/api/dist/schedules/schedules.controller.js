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
import { Controller, Get, Post, Put, Body, Query, Param, UseGuards, } from '@nestjs/common';
import { SchedulesService } from './schedules.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { SaveScheduleDto } from './dto/save-schedule.dto.js';
let SchedulesController = class SchedulesController {
    schedulesService;
    constructor(schedulesService) {
        this.schedulesService = schedulesService;
    }
    getMySchedules(userId, year, month) {
        return this.schedulesService.getMySchedules(userId, +year, +month);
    }
    saveMySchedules(userId, dto) {
        return this.schedulesService.saveMySchedules(userId, dto);
    }
    submitMySchedules(userId, year, month) {
        return this.schedulesService.submitMySchedules(userId, +year, +month);
    }
    getAllSchedules(year, month, roleId, shiftTypeId) {
        return this.schedulesService.getAllSchedules(+year, +month, {
            roleId: roleId ? BigInt(roleId) : undefined,
            shiftTypeId: shiftTypeId ? BigInt(shiftTypeId) : undefined,
        });
    }
    getUserSchedules(userId, year, month) {
        return this.schedulesService.getMySchedules(BigInt(userId), +year, +month);
    }
    adminSaveUserSchedules(userId, dto) {
        return this.schedulesService.adminSaveUserSchedules(BigInt(userId), dto);
    }
    lockMonth(id, year, month) {
        return this.schedulesService.lockMonth(BigInt(id), +year, +month);
    }
    unlockMonth(id, year, month) {
        return this.schedulesService.unlockMonth(BigInt(id), +year, +month);
    }
    rejectMonth(id, year, month) {
        return this.schedulesService.rejectMonth(BigInt(id), +year, +month);
    }
};
__decorate([
    Get('mine'),
    __param(0, CurrentUser('sub')),
    __param(1, Query('year')),
    __param(2, Query('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [BigInt, String, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "getMySchedules", null);
__decorate([
    Post('mine'),
    __param(0, CurrentUser('sub')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [BigInt, SaveScheduleDto]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "saveMySchedules", null);
__decorate([
    Post('mine/submit'),
    __param(0, CurrentUser('sub')),
    __param(1, Query('year')),
    __param(2, Query('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [BigInt, String, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "submitMySchedules", null);
__decorate([
    Get('all'),
    __param(0, Query('year')),
    __param(1, Query('month')),
    __param(2, Query('roleId')),
    __param(3, Query('shiftTypeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "getAllSchedules", null);
__decorate([
    Get('users/:userId'),
    __param(0, Param('userId')),
    __param(1, Query('year')),
    __param(2, Query('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "getUserSchedules", null);
__decorate([
    Put('users/:userId'),
    UseGuards(AdminGuard),
    __param(0, Param('userId')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, SaveScheduleDto]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "adminSaveUserSchedules", null);
__decorate([
    Post(':id/lock'),
    UseGuards(AdminGuard),
    __param(0, Param('id')),
    __param(1, Query('year')),
    __param(2, Query('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "lockMonth", null);
__decorate([
    Post(':id/unlock'),
    UseGuards(AdminGuard),
    __param(0, Param('id')),
    __param(1, Query('year')),
    __param(2, Query('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "unlockMonth", null);
__decorate([
    Post(':id/reject'),
    UseGuards(AdminGuard),
    __param(0, Param('id')),
    __param(1, Query('year')),
    __param(2, Query('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], SchedulesController.prototype, "rejectMonth", null);
SchedulesController = __decorate([
    Controller('schedules'),
    UseGuards(JwtAuthGuard),
    __metadata("design:paramtypes", [SchedulesService])
], SchedulesController);
export { SchedulesController };
//# sourceMappingURL=schedules.controller.js.map
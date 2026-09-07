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
import { Controller, Get, Post, Put, Delete, Patch, Body, Param, UseGuards, } from '@nestjs/common';
import { ShiftTypesService } from './shift-types.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { CreateShiftTypeDto } from './dto/create-shift-type.dto.js';
import { UpdateShiftTypeDto } from './dto/update-shift-type.dto.js';
let ShiftTypesController = class ShiftTypesController {
    shiftTypesService;
    constructor(shiftTypesService) {
        this.shiftTypesService = shiftTypesService;
    }
    findAll() {
        return this.shiftTypesService.findAll();
    }
    create(dto) {
        return this.shiftTypesService.create(dto);
    }
    findOne(id) {
        return this.shiftTypesService.findOne(BigInt(id));
    }
    update(id, dto) {
        return this.shiftTypesService.update(BigInt(id), dto);
    }
    remove(id) {
        return this.shiftTypesService.remove(BigInt(id));
    }
    toggleStatus(id) {
        return this.shiftTypesService.toggleStatus(BigInt(id));
    }
};
__decorate([
    Get(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ShiftTypesController.prototype, "findAll", null);
__decorate([
    Post(),
    UseGuards(AdminGuard),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateShiftTypeDto]),
    __metadata("design:returntype", void 0)
], ShiftTypesController.prototype, "create", null);
__decorate([
    Get(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ShiftTypesController.prototype, "findOne", null);
__decorate([
    Put(':id'),
    UseGuards(AdminGuard),
    __param(0, Param('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateShiftTypeDto]),
    __metadata("design:returntype", void 0)
], ShiftTypesController.prototype, "update", null);
__decorate([
    Delete(':id'),
    UseGuards(AdminGuard),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ShiftTypesController.prototype, "remove", null);
__decorate([
    Patch(':id/status'),
    UseGuards(AdminGuard),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ShiftTypesController.prototype, "toggleStatus", null);
ShiftTypesController = __decorate([
    Controller('shift-types'),
    UseGuards(JwtAuthGuard),
    __metadata("design:paramtypes", [ShiftTypesService])
], ShiftTypesController);
export { ShiftTypesController };
//# sourceMappingURL=shift-types.controller.js.map
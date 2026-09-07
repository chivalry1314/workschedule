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
import { Controller, Get, Post, Body, Param, UseGuards, } from '@nestjs/common';
import { SwapsService } from './swaps.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../auth/guards/admin.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CreateSwapDto } from './dto/create-swap.dto.js';
let SwapsController = class SwapsController {
    swapsService;
    constructor(swapsService) {
        this.swapsService = swapsService;
    }
    findByUser(userId) {
        return this.swapsService.findByUser(userId);
    }
    create(userId, dto) {
        return this.swapsService.create(userId, dto);
    }
    approve(userId, id) {
        return this.swapsService.approve(BigInt(id), userId);
    }
    reject(userId, id) {
        return this.swapsService.reject(BigInt(id), userId);
    }
    withdraw(userId, id) {
        return this.swapsService.withdraw(BigInt(id), userId);
    }
    adminApprove(adminId, id) {
        return this.swapsService.adminApprove(BigInt(id), adminId, true);
    }
    adminReject(adminId, id) {
        return this.swapsService.adminApprove(BigInt(id), adminId, false);
    }
};
__decorate([
    Get(),
    __param(0, CurrentUser('sub')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [BigInt]),
    __metadata("design:returntype", void 0)
], SwapsController.prototype, "findByUser", null);
__decorate([
    Post(),
    __param(0, CurrentUser('sub')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [BigInt, CreateSwapDto]),
    __metadata("design:returntype", void 0)
], SwapsController.prototype, "create", null);
__decorate([
    Post(':id/approve'),
    __param(0, CurrentUser('sub')),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [BigInt, String]),
    __metadata("design:returntype", void 0)
], SwapsController.prototype, "approve", null);
__decorate([
    Post(':id/reject'),
    __param(0, CurrentUser('sub')),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [BigInt, String]),
    __metadata("design:returntype", void 0)
], SwapsController.prototype, "reject", null);
__decorate([
    Post(':id/withdraw'),
    __param(0, CurrentUser('sub')),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [BigInt, String]),
    __metadata("design:returntype", void 0)
], SwapsController.prototype, "withdraw", null);
__decorate([
    Post(':id/admin-approve'),
    UseGuards(AdminGuard),
    __param(0, CurrentUser('sub')),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [BigInt, String]),
    __metadata("design:returntype", void 0)
], SwapsController.prototype, "adminApprove", null);
__decorate([
    Post(':id/admin-reject'),
    UseGuards(AdminGuard),
    __param(0, CurrentUser('sub')),
    __param(1, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [BigInt, String]),
    __metadata("design:returntype", void 0)
], SwapsController.prototype, "adminReject", null);
SwapsController = __decorate([
    Controller('swaps'),
    UseGuards(JwtAuthGuard),
    __metadata("design:paramtypes", [SwapsService])
], SwapsController);
export { SwapsController };
//# sourceMappingURL=swaps.controller.js.map
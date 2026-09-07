var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsInt, IsOptional, IsString } from 'class-validator';
export class CreateSwapDto {
    applicantScheduleId;
    targetUserId;
    targetScheduleId;
    swapType;
    reason;
}
__decorate([
    IsInt({ message: '申请人排班ID必须是整数' }),
    __metadata("design:type", Number)
], CreateSwapDto.prototype, "applicantScheduleId", void 0);
__decorate([
    IsOptional(),
    IsInt({ message: '目标用户ID必须是整数' }),
    __metadata("design:type", Number)
], CreateSwapDto.prototype, "targetUserId", void 0);
__decorate([
    IsOptional(),
    IsInt({ message: '目标排班ID必须是整数' }),
    __metadata("design:type", Number)
], CreateSwapDto.prototype, "targetScheduleId", void 0);
__decorate([
    IsInt({ message: '换班类型必须是整数' }),
    __metadata("design:type", Number)
], CreateSwapDto.prototype, "swapType", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateSwapDto.prototype, "reason", void 0);
//# sourceMappingURL=create-swap.dto.js.map
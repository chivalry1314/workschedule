var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';
export class CreateShiftTypeDto {
    name;
    code;
    color;
    timeRange;
    remark;
    status;
}
__decorate([
    IsString(),
    IsNotEmpty({ message: '类型名称不能为空' }),
    __metadata("design:type", String)
], CreateShiftTypeDto.prototype, "name", void 0);
__decorate([
    IsString(),
    IsNotEmpty({ message: '类型编码不能为空' }),
    __metadata("design:type", String)
], CreateShiftTypeDto.prototype, "code", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], CreateShiftTypeDto.prototype, "color", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], CreateShiftTypeDto.prototype, "timeRange", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], CreateShiftTypeDto.prototype, "remark", void 0);
__decorate([
    IsInt(),
    IsOptional(),
    __metadata("design:type", Number)
], CreateShiftTypeDto.prototype, "status", void 0);
//# sourceMappingURL=create-shift-type.dto.js.map
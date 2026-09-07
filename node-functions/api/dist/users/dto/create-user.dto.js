var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, MinLength, Matches, } from 'class-validator';
export class CreateUserDto {
    username;
    initialPassword;
    realName;
    roleId;
    phone;
    remark;
    isAdmin;
    status;
}
__decorate([
    IsString(),
    IsNotEmpty({ message: '用户名不能为空' }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "username", void 0);
__decorate([
    IsString(),
    MinLength(8, { message: '初始密码至少8位' }),
    Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
        message: '初始密码需同时包含字母和数字',
    }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "initialPassword", void 0);
__decorate([
    IsString(),
    IsNotEmpty({ message: '姓名不能为空' }),
    __metadata("design:type", String)
], CreateUserDto.prototype, "realName", void 0);
__decorate([
    IsInt({ message: '角色ID必须是整数' }),
    __metadata("design:type", Number)
], CreateUserDto.prototype, "roleId", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "phone", void 0);
__decorate([
    IsString(),
    IsOptional(),
    __metadata("design:type", String)
], CreateUserDto.prototype, "remark", void 0);
__decorate([
    IsBoolean(),
    IsOptional(),
    __metadata("design:type", Boolean)
], CreateUserDto.prototype, "isAdmin", void 0);
__decorate([
    IsInt(),
    IsOptional(),
    __metadata("design:type", Number)
], CreateUserDto.prototype, "status", void 0);
//# sourceMappingURL=create-user.dto.js.map
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, UnauthorizedException, BadRequestException, } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service.js';
import { CloudBaseService } from '../cloudbase/cloudbase.service.js';
let AuthService = class AuthService {
    usersService;
    cloudbase;
    jwtService;
    constructor(usersService, cloudbase, jwtService) {
        this.usersService = usersService;
        this.cloudbase = cloudbase;
        this.jwtService = jwtService;
    }
    async validateUser(dto) {
        const user = await this.usersService.findByUsername(dto.username);
        if (!user || user.status !== 1) {
            throw new UnauthorizedException('用户名或密码错误');
        }
        const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isMatch) {
            throw new UnauthorizedException('用户名或密码错误');
        }
        return user;
    }
    async login(dto) {
        const user = await this.validateUser(dto);
        const payload = {
            sub: user.id,
            username: user.username,
            isAdmin: user.isAdmin,
            roleId: user.roleId,
        };
        return {
            access_token: this.jwtService.sign(payload),
            user: this.toUserPayload(user),
        };
    }
    toUserPayload(user) {
        return {
            id: user.id,
            username: user.username,
            realName: user.realName,
            isAdmin: user.isAdmin,
            firstLogin: user.firstLogin,
            role: user.role,
        };
    }
    async me(userId) {
        const user = await this.usersService.findById(userId);
        if (!user || user.status !== 1) {
            throw new UnauthorizedException('登录状态无效，请重新登录');
        }
        return this.toUserPayload(user);
    }
    async changePassword(userId, dto) {
        const { data, error } = await this.cloudbase
            .from('users')
            .select('password_hash')
            .eq('id', userId)
            .limit(1);
        if (error)
            throw error;
        if (!data || data.length === 0) {
            throw new UnauthorizedException('用户不存在');
        }
        const passwordHash = data[0].password_hash;
        const isMatch = await bcrypt.compare(dto.oldPassword, passwordHash);
        if (!isMatch) {
            throw new BadRequestException('原密码错误');
        }
        if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(dto.newPassword)) {
            throw new BadRequestException('新密码需至少8位且包含字母和数字');
        }
        const newHash = await bcrypt.hash(dto.newPassword, 10);
        const { error: updateError } = await this.cloudbase
            .from('users')
            .update({ password_hash: newHash, first_login: false })
            .eq('id', userId);
        if (updateError)
            throw updateError;
        return { message: '密码修改成功' };
    }
    async generateInitialPassword(password) {
        return bcrypt.hash(password, 10);
    }
};
AuthService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [UsersService,
        CloudBaseService,
        JwtService])
], AuthService);
export { AuthService };
//# sourceMappingURL=auth.service.js.map
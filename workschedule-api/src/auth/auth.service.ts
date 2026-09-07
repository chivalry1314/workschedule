import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { CloudBaseService } from '../cloudbase/cloudbase.service.js';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private cloudbase: CloudBaseService,
    private jwtService: JwtService,
  ) {}

  async validateUser(dto: LoginDto) {
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

  async login(dto: LoginDto) {
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

  private toUserPayload(user: any) {
    return {
      id: user.id,
      username: user.username,
      realName: user.realName,
      isAdmin: user.isAdmin,
      firstLogin: user.firstLogin,
      role: user.role,
    };
  }

  // 根据 token 中的用户 id 获取当前登录用户信息（校验登录状态用）
  async me(userId: bigint) {
    const user = await this.usersService.findById(userId);
    if (!user || user.status !== 1) {
      throw new UnauthorizedException('登录状态无效，请重新登录');
    }
    return this.toUserPayload(user);
  }

  async changePassword(userId: bigint, dto: ChangePasswordDto) {
    const { data, error } = await this.cloudbase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new UnauthorizedException('用户不存在');
    }

    const passwordHash = (data[0] as any).password_hash;
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

    if (updateError) throw updateError;

    return { message: '密码修改成功' };
  }

  async generateInitialPassword(password: string) {
    return bcrypt.hash(password, 10);
  }
}

import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { CloudBaseService } from '../cloudbase/cloudbase.service.js';
export declare class AuthService {
    private usersService;
    private cloudbase;
    private jwtService;
    constructor(usersService: UsersService, cloudbase: CloudBaseService, jwtService: JwtService);
    validateUser(dto: LoginDto): Promise<{
        role: {
            id: any;
            name: any;
            shiftTypes: any[];
        } | null;
        id: any;
        username: any;
        passwordHash: any;
        realName: any;
        roleId: any;
        phone: any;
        remark: any;
        isAdmin: any;
        status: any;
        firstLogin: any;
        createdAt: any;
        updatedAt: any;
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: any;
            username: any;
            realName: any;
            isAdmin: any;
            firstLogin: any;
            role: any;
        };
    }>;
    private toUserPayload;
    me(userId: bigint): Promise<{
        id: any;
        username: any;
        realName: any;
        isAdmin: any;
        firstLogin: any;
        role: any;
    }>;
    changePassword(userId: bigint, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    generateInitialPassword(password: string): Promise<string>;
}

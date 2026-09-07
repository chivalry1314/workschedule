import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
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
}

import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
export declare class UsersController {
    private usersService;
    constructor(usersService: UsersService);
    findAll(page?: string, pageSize?: string, keyword?: string, roleId?: string): Promise<{
        list: {
            role: any;
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
        }[];
        total: any;
    }>;
    create(dto: CreateUserDto): Promise<{
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
    findOne(id: string): Promise<{
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
    update(id: string, dto: UpdateUserDto): Promise<{
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
    remove(id: string): Promise<{
        message: string;
    }>;
    resetPassword(id: string, password: string): Promise<{
        message: string;
        password: string;
    }>;
}

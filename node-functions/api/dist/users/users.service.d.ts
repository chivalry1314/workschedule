import { CloudBaseService } from '../cloudbase/cloudbase.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
export declare class UsersService {
    private cloudbase;
    constructor(cloudbase: CloudBaseService);
    private mapUser;
    private roleWithShiftTypes;
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
    findAll(query: {
        page?: number;
        pageSize?: number;
        keyword?: string;
        roleId?: bigint;
    }): Promise<{
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
    findOne(id: bigint): Promise<{
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
    findByUsername(username: string): Promise<{
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
    } | null>;
    findById(id: bigint): Promise<{
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
    } | null>;
    update(id: bigint, dto: UpdateUserDto): Promise<{
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
    remove(id: bigint): Promise<{
        message: string;
    }>;
    resetPassword(id: bigint, newPassword?: string): Promise<{
        message: string;
        password: string;
    }>;
    seedAdmin(): Promise<void>;
}

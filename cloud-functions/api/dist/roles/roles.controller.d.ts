import { RolesService } from './roles.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
export declare class RolesController {
    private rolesService;
    constructor(rolesService: RolesService);
    findAll(): Promise<{
        shiftTypes: any[];
        _count: {
            users: any;
        };
        id: any;
        name: any;
        remark: any;
        createdAt: any;
        updatedAt: any;
    }[]>;
    create(dto: CreateRoleDto): Promise<{
        shiftTypes: any[];
        _count: {
            users: any;
        };
        id: any;
        name: any;
        remark: any;
        createdAt: any;
        updatedAt: any;
    }>;
    findOne(id: string): Promise<{
        shiftTypes: any[];
        _count: {
            users: any;
        };
        id: any;
        name: any;
        remark: any;
        createdAt: any;
        updatedAt: any;
    }>;
    update(id: string, dto: UpdateRoleDto): Promise<{
        shiftTypes: any[];
        _count: {
            users: any;
        };
        id: any;
        name: any;
        remark: any;
        createdAt: any;
        updatedAt: any;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}

import { CloudBaseService } from '../cloudbase/cloudbase.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
export declare class RolesService {
    private cloudbase;
    constructor(cloudbase: CloudBaseService);
    private mapRole;
    private buildRoleOutput;
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
    findOne(id: bigint): Promise<{
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
    update(id: bigint, dto: UpdateRoleDto): Promise<{
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
    remove(id: bigint): Promise<{
        message: string;
    }>;
}

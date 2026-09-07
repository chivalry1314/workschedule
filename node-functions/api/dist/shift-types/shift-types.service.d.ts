import { CloudBaseService } from '../cloudbase/cloudbase.service.js';
import { CreateShiftTypeDto } from './dto/create-shift-type.dto.js';
import { UpdateShiftTypeDto } from './dto/update-shift-type.dto.js';
export declare class ShiftTypesService {
    private cloudbase;
    constructor(cloudbase: CloudBaseService);
    private mapType;
    create(dto: CreateShiftTypeDto): Promise<{
        id: any;
        name: any;
        code: any;
        color: any;
        timeRange: any;
        remark: any;
        status: any;
        createdAt: any;
        updatedAt: any;
    }>;
    findAll(): Promise<{
        id: any;
        name: any;
        code: any;
        color: any;
        timeRange: any;
        remark: any;
        status: any;
        createdAt: any;
        updatedAt: any;
    }[]>;
    findOne(id: bigint): Promise<{
        id: any;
        name: any;
        code: any;
        color: any;
        timeRange: any;
        remark: any;
        status: any;
        createdAt: any;
        updatedAt: any;
    }>;
    update(id: bigint, dto: UpdateShiftTypeDto): Promise<{
        id: any;
        name: any;
        code: any;
        color: any;
        timeRange: any;
        remark: any;
        status: any;
        createdAt: any;
        updatedAt: any;
    }>;
    remove(id: bigint): Promise<{
        message: string;
    }>;
    toggleStatus(id: bigint): Promise<{
        id: any;
        name: any;
        code: any;
        color: any;
        timeRange: any;
        remark: any;
        status: any;
        createdAt: any;
        updatedAt: any;
    }>;
}

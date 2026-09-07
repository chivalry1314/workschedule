import { ShiftTypesService } from './shift-types.service.js';
import { CreateShiftTypeDto } from './dto/create-shift-type.dto.js';
import { UpdateShiftTypeDto } from './dto/update-shift-type.dto.js';
export declare class ShiftTypesController {
    private shiftTypesService;
    constructor(shiftTypesService: ShiftTypesService);
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
    findOne(id: string): Promise<{
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
    update(id: string, dto: UpdateShiftTypeDto): Promise<{
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
    remove(id: string): Promise<{
        message: string;
    }>;
    toggleStatus(id: string): Promise<{
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

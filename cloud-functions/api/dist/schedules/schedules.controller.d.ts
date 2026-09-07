import { SchedulesService } from './schedules.service.js';
import { SaveScheduleDto } from './dto/save-schedule.dto.js';
export declare class SchedulesController {
    private schedulesService;
    constructor(schedulesService: SchedulesService);
    getMySchedules(userId: bigint, year: string, month: string): Promise<{
        monthKey: string;
        status: number;
        schedules: {
            id: number;
            userId: number;
            shiftTypeId: number | null;
            workDate: any;
            monthKey: any;
            status: number;
            source: number;
            createdAt: any;
            updatedAt: any;
            shiftType: {
                id: number;
                name: any;
                code: any;
                color: any;
            } | null;
        }[];
        editable: boolean;
        lockReason: string;
        window: {
            startAt: any;
            endAt: any;
        } | null;
    }>;
    saveMySchedules(userId: bigint, dto: SaveScheduleDto): Promise<{
        monthKey: string;
        status: number;
        schedules: {
            id: number;
            userId: number;
            shiftTypeId: number | null;
            workDate: any;
            monthKey: any;
            status: number;
            source: number;
            createdAt: any;
            updatedAt: any;
            shiftType: {
                id: number;
                name: any;
                code: any;
                color: any;
            } | null;
        }[];
        editable: boolean;
        lockReason: string;
        window: {
            startAt: any;
            endAt: any;
        } | null;
    }>;
    submitMySchedules(userId: bigint, year: string, month: string): Promise<{
        monthKey: string;
        status: number;
        schedules: {
            id: number;
            userId: number;
            shiftTypeId: number | null;
            workDate: any;
            monthKey: any;
            status: number;
            source: number;
            createdAt: any;
            updatedAt: any;
            shiftType: {
                id: number;
                name: any;
                code: any;
                color: any;
            } | null;
        }[];
        editable: boolean;
        lockReason: string;
        window: {
            startAt: any;
            endAt: any;
        } | null;
    }>;
    getAllSchedules(year: string, month: string, roleId?: string, shiftTypeId?: string): Promise<{
        monthKey: string;
        users: {
            id: number;
            realName: any;
            username: any;
            roleId: number | null;
            status: any;
            isAdmin: any;
        }[];
        grouped: Record<string, any[]>;
    }>;
    getUserSchedules(userId: string, year: string, month: string): Promise<{
        monthKey: string;
        status: number;
        schedules: {
            id: number;
            userId: number;
            shiftTypeId: number | null;
            workDate: any;
            monthKey: any;
            status: number;
            source: number;
            createdAt: any;
            updatedAt: any;
            shiftType: {
                id: number;
                name: any;
                code: any;
                color: any;
            } | null;
        }[];
        editable: boolean;
        lockReason: string;
        window: {
            startAt: any;
            endAt: any;
        } | null;
    }>;
    adminSaveUserSchedules(userId: string, dto: SaveScheduleDto): Promise<{
        monthKey: string;
        status: number;
        schedules: {
            id: number;
            userId: number;
            shiftTypeId: number | null;
            workDate: any;
            monthKey: any;
            status: number;
            source: number;
            createdAt: any;
            updatedAt: any;
            shiftType: {
                id: number;
                name: any;
                code: any;
                color: any;
            } | null;
        }[];
        editable: boolean;
        lockReason: string;
        window: {
            startAt: any;
            endAt: any;
        } | null;
    }>;
    lockMonth(id: string, year: string, month: string): Promise<{
        message: string;
    }>;
    unlockMonth(id: string, year: string, month: string): Promise<{
        message: string;
    }>;
    rejectMonth(id: string, year: string, month: string): Promise<{
        message: string;
    }>;
}

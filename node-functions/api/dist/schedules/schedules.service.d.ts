import { CloudBaseService } from '../cloudbase/cloudbase.service.js';
import { ScheduleWindowsService } from '../schedule-windows/schedule-windows.service.js';
import { SaveScheduleDto } from './dto/save-schedule.dto.js';
export declare class SchedulesService {
    private cloudbase;
    private scheduleWindows;
    constructor(cloudbase: CloudBaseService, scheduleWindows: ScheduleWindowsService);
    private checkWindow;
    private formatMonthKey;
    private mapSchedule;
    private loadShiftTypes;
    getMySchedules(userId: bigint, year: number, month: number): Promise<{
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
    adminSaveUserSchedules(targetUserId: bigint, dto: SaveScheduleDto): Promise<{
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
    private applyScheduleItems;
    private validateScheduleRules;
    private getShiftTypeName;
    submitMySchedules(userId: bigint, year: number, month: number): Promise<{
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
    getAllSchedules(year: number, month: number, query?: {
        roleId?: bigint;
        shiftTypeId?: bigint;
    }): Promise<{
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
    lockMonth(userId: bigint, year: number, month: number): Promise<{
        message: string;
    }>;
    unlockMonth(userId: bigint, year: number, month: number): Promise<{
        message: string;
    }>;
    rejectMonth(userId: bigint, year: number, month: number): Promise<{
        message: string;
    }>;
}

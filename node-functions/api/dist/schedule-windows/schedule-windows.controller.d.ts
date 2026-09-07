import { ScheduleWindowsService } from './schedule-windows.service.js';
export declare class ScheduleWindowsController {
    private scheduleWindowsService;
    constructor(scheduleWindowsService: ScheduleWindowsService);
    findByMonth(monthKey: string): Promise<{
        id: number;
        monthKey: any;
        startAt: any;
        endAt: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    upsert(body: {
        monthKey: string;
        startAt?: string;
        endAt?: string;
    }): Promise<{
        id: number;
        monthKey: any;
        startAt: any;
        endAt: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
}

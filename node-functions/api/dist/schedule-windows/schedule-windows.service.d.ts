import { CloudBaseService } from '../cloudbase/cloudbase.service.js';
export interface ScheduleWindowInput {
    monthKey: string;
    startAt?: string | null;
    endAt?: string | null;
}
export declare class ScheduleWindowsService {
    private cloudbase;
    constructor(cloudbase: CloudBaseService);
    private mapWindow;
    findByMonth(monthKey: string): Promise<{
        id: number;
        monthKey: any;
        startAt: any;
        endAt: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    upsert(input: ScheduleWindowInput): Promise<{
        id: number;
        monthKey: any;
        startAt: any;
        endAt: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
}

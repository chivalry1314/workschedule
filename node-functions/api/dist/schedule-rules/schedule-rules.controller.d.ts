import { ScheduleRulesService } from './schedule-rules.service.js';
export declare class ScheduleRulesController {
    private scheduleRulesService;
    constructor(scheduleRulesService: ScheduleRulesService);
    findAll(monthKey?: string): Promise<{
        id: number;
        monthKey: any;
        ruleType: number;
        shiftTypeId: number | null;
        attendanceType: number | null;
        maxCount: number;
        createdAt: any;
        updatedAt: any;
    }[]>;
    replaceAll(body: {
        monthKey: string;
        rules: {
            ruleType: number;
            shiftTypeId?: number;
            attendanceType?: number;
            maxCount: number;
        }[];
    }): Promise<{
        id: number;
        monthKey: any;
        ruleType: number;
        shiftTypeId: number | null;
        attendanceType: number | null;
        maxCount: number;
        createdAt: any;
        updatedAt: any;
    }[]>;
}

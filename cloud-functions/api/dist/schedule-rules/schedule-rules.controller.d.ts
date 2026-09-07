import { ScheduleRulesService } from './schedule-rules.service.js';
export declare class ScheduleRulesController {
    private scheduleRulesService;
    constructor(scheduleRulesService: ScheduleRulesService);
    findAll(monthKey?: string): Promise<{
        id: number;
        monthKey: any;
        ruleType: number;
        shiftTypeId: number;
        maxCount: number;
        createdAt: any;
        updatedAt: any;
    }[]>;
    replaceAll(body: {
        monthKey: string;
        rules: {
            ruleType: number;
            shiftTypeId: number;
            maxCount: number;
        }[];
    }): Promise<{
        id: number;
        monthKey: any;
        ruleType: number;
        shiftTypeId: number;
        maxCount: number;
        createdAt: any;
        updatedAt: any;
    }[]>;
}

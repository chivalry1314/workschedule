import { CloudBaseService } from '../cloudbase/cloudbase.service.js';
export interface ScheduleRuleInput {
    ruleType: number;
    shiftTypeId: number;
    maxCount: number;
}
export declare class ScheduleRulesService {
    private cloudbase;
    constructor(cloudbase: CloudBaseService);
    private mapRule;
    findAll(monthKey?: string): Promise<{
        id: number;
        monthKey: any;
        ruleType: number;
        shiftTypeId: number;
        maxCount: number;
        createdAt: any;
        updatedAt: any;
    }[]>;
    replaceAll(monthKey: string, rules: ScheduleRuleInput[]): Promise<{
        id: number;
        monthKey: any;
        ruleType: number;
        shiftTypeId: number;
        maxCount: number;
        createdAt: any;
        updatedAt: any;
    }[]>;
}

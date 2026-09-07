var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { CloudBaseService } from '../cloudbase/cloudbase.service.js';
let ScheduleRulesService = class ScheduleRulesService {
    cloudbase;
    constructor(cloudbase) {
        this.cloudbase = cloudbase;
    }
    mapRule(row) {
        return {
            id: Number(row.id),
            monthKey: row.month_key,
            ruleType: Number(row.rule_type),
            shiftTypeId: Number(row.shift_type_id),
            maxCount: Number(row.max_count),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    async findAll(monthKey) {
        let builder = this.cloudbase
            .from('schedule_rules')
            .select('id,month_key,rule_type,shift_type_id,max_count,created_at,updated_at');
        if (monthKey) {
            builder = builder.eq('month_key', monthKey);
        }
        const { data, error } = await builder;
        if (error)
            throw error;
        return (data ?? []).map((r) => this.mapRule(r));
    }
    async replaceAll(monthKey, rules) {
        const { error: deleteError } = await this.cloudbase
            .from('schedule_rules')
            .delete()
            .eq('month_key', monthKey);
        if (deleteError)
            throw deleteError;
        const valid = (rules ?? []).filter((r) => r && r.shiftTypeId && r.maxCount > 0 && [1, 2, 3].includes(Number(r.ruleType)));
        for (const rule of valid) {
            const { error } = await this.cloudbase.from('schedule_rules').insert({
                month_key: monthKey,
                rule_type: Number(rule.ruleType),
                shift_type_id: Number(rule.shiftTypeId),
                max_count: Number(rule.maxCount),
            });
            if (error)
                throw error;
        }
        return this.findAll(monthKey);
    }
};
ScheduleRulesService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [CloudBaseService])
], ScheduleRulesService);
export { ScheduleRulesService };
//# sourceMappingURL=schedule-rules.service.js.map
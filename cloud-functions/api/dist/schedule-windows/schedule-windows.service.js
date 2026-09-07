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
let ScheduleWindowsService = class ScheduleWindowsService {
    cloudbase;
    constructor(cloudbase) {
        this.cloudbase = cloudbase;
    }
    mapWindow(row) {
        if (!row)
            return null;
        return {
            id: Number(row.id),
            monthKey: row.month_key,
            startAt: row.start_at,
            endAt: row.end_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    async findByMonth(monthKey) {
        const { data, error } = await this.cloudbase
            .from('schedule_windows')
            .select('id,month_key,start_at,end_at,created_at,updated_at')
            .eq('month_key', monthKey)
            .limit(1);
        if (error)
            throw error;
        return this.mapWindow(data?.[0]);
    }
    async upsert(input) {
        const existing = await this.findByMonth(input.monthKey);
        const payload = {
            start_at: input.startAt ?? null,
            end_at: input.endAt ?? null,
            updated_at: new Date().toISOString(),
        };
        if (existing) {
            const { error } = await this.cloudbase
                .from('schedule_windows')
                .update(payload)
                .eq('id', existing.id);
            if (error)
                throw error;
        }
        else {
            const now = new Date().toISOString();
            const { error } = await this.cloudbase.from('schedule_windows').insert({
                month_key: input.monthKey,
                start_at: input.startAt ?? null,
                end_at: input.endAt ?? null,
                created_at: now,
                updated_at: now,
            });
            if (error)
                throw error;
        }
        return this.findByMonth(input.monthKey);
    }
};
ScheduleWindowsService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [CloudBaseService])
], ScheduleWindowsService);
export { ScheduleWindowsService };
//# sourceMappingURL=schedule-windows.service.js.map
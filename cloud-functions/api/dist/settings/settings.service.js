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
let SettingsService = class SettingsService {
    cloudbase;
    constructor(cloudbase) {
        this.cloudbase = cloudbase;
    }
    mapSetting(row) {
        return {
            id: row.id,
            settingKey: row.setting_key,
            settingValue: row.setting_value,
            remark: row.remark,
        };
    }
    async findAll() {
        const { data, error } = await this.cloudbase
            .from('settings')
            .select('id,setting_key,setting_value,remark');
        if (error)
            throw error;
        return data.map((r) => this.mapSetting(r));
    }
    async getValue(key, defaultValue) {
        const { data, error } = await this.cloudbase
            .from('settings')
            .select('setting_value')
            .eq('setting_key', key)
            .limit(1);
        if (error)
            throw error;
        const value = data?.[0]?.setting_value;
        return value ?? defaultValue;
    }
    async upsert(key, value, remark) {
        const { count, error: countError } = await this.cloudbase
            .from('settings')
            .select('*', { count: 'exact', head: true })
            .eq('setting_key', key);
        if (countError)
            throw countError;
        if ((count ?? 0) > 0) {
            const { error } = await this.cloudbase
                .from('settings')
                .update({
                setting_value: value ?? null,
                remark: remark ?? null,
            })
                .eq('setting_key', key);
            if (error)
                throw error;
        }
        else {
            const { error } = await this.cloudbase.from('settings').insert({
                setting_key: key,
                setting_value: value ?? null,
                remark: remark ?? null,
            });
            if (error)
                throw error;
        }
        const { data, error } = await this.cloudbase
            .from('settings')
            .select('id,setting_key,setting_value,remark')
            .eq('setting_key', key)
            .limit(1);
        if (error)
            throw error;
        return this.mapSetting(data[0]);
    }
    async updateBatch(items) {
        const results = [];
        for (const item of items) {
            results.push(await this.upsert(item.settingKey, item.settingValue, item.remark));
        }
        return results;
    }
};
SettingsService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [CloudBaseService])
], SettingsService);
export { SettingsService };
//# sourceMappingURL=settings.service.js.map
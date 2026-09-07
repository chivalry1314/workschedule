import { Injectable } from '@nestjs/common';
import { CloudBaseService } from '../cloudbase/cloudbase.service.js';

@Injectable()
export class SettingsService {
  constructor(private cloudbase: CloudBaseService) {}

  private mapSetting(row: any) {
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
    if (error) throw error;

    return (data as any[]).map((r) => this.mapSetting(r));
  }

  async getValue(key: string, defaultValue?: string) {
    const { data, error } = await this.cloudbase
      .from('settings')
      .select('setting_value')
      .eq('setting_key', key)
      .limit(1);
    if (error) throw error;

    const value = (data?.[0] as any)?.setting_value;
    return value ?? defaultValue;
  }

  async upsert(key: string, value: string, remark?: string) {
    const { count, error: countError } = await this.cloudbase
      .from('settings')
      .select('*', { count: 'exact', head: true })
      .eq('setting_key', key);
    if (countError) throw countError;

    if ((count ?? 0) > 0) {
      const { error } = await this.cloudbase
        .from('settings')
        .update({
          setting_value: value ?? null,
          remark: remark ?? null,
        })
        .eq('setting_key', key);
      if (error) throw error;
    } else {
      const { error } = await this.cloudbase.from('settings').insert({
        setting_key: key,
        setting_value: value ?? null,
        remark: remark ?? null,
      });
      if (error) throw error;
    }

    const { data, error } = await this.cloudbase
      .from('settings')
      .select('id,setting_key,setting_value,remark')
      .eq('setting_key', key)
      .limit(1);
    if (error) throw error;

    return this.mapSetting((data as any[])[0]);
  }

  async updateBatch(items: { settingKey: string; settingValue: string; remark?: string }[]) {
    const results = [];
    for (const item of items) {
      results.push(await this.upsert(item.settingKey, item.settingValue, item.remark));
    }
    return results;
  }
}

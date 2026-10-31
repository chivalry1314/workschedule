import { Injectable } from '@nestjs/common';
import { CloudBaseService } from '../cloudbase/cloudbase.service.js';

const START_MONTH_KEY = 'schedule_statistics_start_month';
const END_MONTH_KEY = 'schedule_statistics_end_month';

@Injectable()
export class ScheduleStatisticsService {
  constructor(private cloudbase: CloudBaseService) {}

  private getDefaultStartMonth() {
    const now = new Date();
    return `${now.getFullYear() - 1}-01`;
  }

  private getDefaultEndMonth() {
    const now = new Date();
    return this.formatMonthKey(now.getFullYear(), now.getMonth() + 1);
  }

  private formatMonthKey(year: number, month: number) {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  private async getSetting(key: string, defaultValue: string) {
    const { data, error } = await this.cloudbase
      .from('settings')
      .select('setting_value')
      .eq('setting_key', key)
      .limit(1);
    if (error) throw error;
    const value = (data?.[0] as any)?.setting_value;
    return value || defaultValue;
  }

  private async setSetting(key: string, value: string) {
    const { data, error } = await this.cloudbase
      .from('settings')
      .select('id')
      .eq('setting_key', key)
      .limit(1);
    if (error) throw error;

    if (data && data.length > 0) {
      const { error: updateError } = await this.cloudbase
        .from('settings')
        .update({ setting_value: value })
        .eq('setting_key', key);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await this.cloudbase.from('settings').insert({
        setting_key: key,
        setting_value: value,
      });
      if (insertError) throw insertError;
    }
  }

  async getStartMonth() {
    return this.getSetting(START_MONTH_KEY, this.getDefaultStartMonth());
  }

  async setStartMonth(monthKey: string) {
    await this.setSetting(START_MONTH_KEY, monthKey);
    return { startMonth: monthKey };
  }

  async getEndMonth() {
    return this.getSetting(END_MONTH_KEY, this.getDefaultEndMonth());
  }

  async setEndMonth(monthKey: string) {
    await this.setSetting(END_MONTH_KEY, monthKey);
    return { endMonth: monthKey };
  }

  async getStatistics(query?: { startMonth?: string; endMonth?: string }) {
    const startMonth = query?.startMonth || (await this.getStartMonth());
    const endMonth = query?.endMonth || (await this.getEndMonth());

    const { data: userRows, error: userError } = await this.cloudbase
      .from('users')
      .select('id,real_name,username')
      .eq('status', 1)
      .eq('is_admin', false)
      .order('id', { ascending: true });
    if (userError) throw userError;

    const { data: shiftTypeRows, error: stError } = await this.cloudbase
      .from('shift_types')
      .select('id,name,code,color')
      .eq('status', 1)
      .order('id', { ascending: true });
    if (stError) throw stError;

    const users = ((userRows as any[]) ?? []).map((u) => ({
      id: Number(u.id),
      realName: u.real_name,
      username: u.username,
    }));
    const shiftTypes = ((shiftTypeRows as any[]) ?? []).map((st) => ({
      id: Number(st.id),
      name: st.name,
      code: st.code,
      color: st.color,
    }));

    let matrix: any[] = [];
    if (users.length > 0 && shiftTypes.length > 0) {
      const { data: scheduleRows, error: scheduleError } = await this.cloudbase
        .from('schedules')
        .select('user_id,shift_type_id,month_key')
        .in('user_id', users.map((u) => u.id));
      if (scheduleError) throw scheduleError;

      const countMap = new Map<number, Map<number, number>>();
      for (const r of (scheduleRows as any[]) ?? []) {
        if (r.shift_type_id === null || r.shift_type_id === undefined) continue;
        const monthKey = r.month_key;
        if (startMonth && monthKey < startMonth) continue;
        if (endMonth && monthKey > endMonth) continue;
        const uid = Number(r.user_id);
        const stId = Number(r.shift_type_id);
        if (!countMap.has(uid)) {
          countMap.set(uid, new Map());
        }
        const stMap = countMap.get(uid)!;
        stMap.set(stId, (stMap.get(stId) ?? 0) + 1);
      }

      matrix = users.map((u) => ({
        user: u,
        counts: shiftTypes.map((st) => countMap.get(u.id)?.get(st.id) ?? 0),
      }));
    }

    return { startMonth, endMonth, users, shiftTypes, matrix };
  }
}

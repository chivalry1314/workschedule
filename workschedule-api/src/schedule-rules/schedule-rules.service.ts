import { Injectable } from '@nestjs/common';
import { CloudBaseService } from '../cloudbase/cloudbase.service.js';

export interface ScheduleRuleInput {
  ruleType: number;
  shiftTypeId?: number;
  attendanceType?: number;
  maxCount: number;
}

@Injectable()
export class ScheduleRulesService {
  constructor(private cloudbase: CloudBaseService) {}

  private mapRule(row: any) {
    return {
      id: Number(row.id),
      monthKey: row.month_key,
      ruleType: Number(row.rule_type),
      shiftTypeId: row.shift_type_id ? Number(row.shift_type_id) : null,
      attendanceType: row.attendance_type !== null && row.attendance_type !== undefined
        ? Number(row.attendance_type)
        : null,
      maxCount: Number(row.max_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findAll(monthKey?: string) {
    let builder: any = this.cloudbase
      .from('schedule_rules')
      .select('id,month_key,rule_type,shift_type_id,attendance_type,max_count,created_at,updated_at');
    if (monthKey) {
      builder = builder.eq('month_key', monthKey);
    }
    const { data, error } = await builder;
    if (error) throw error;
    return ((data as any[]) ?? []).map((r) => this.mapRule(r));
  }

  async replaceAll(monthKey: string, rules: ScheduleRuleInput[]) {
    const { error: deleteError } = await this.cloudbase
      .from('schedule_rules')
      .delete()
      .eq('month_key', monthKey);
    if (deleteError) throw deleteError;

    const valid = (rules ?? []).filter((r) => {
      if (!r || r.maxCount <= 0 || ![1, 2, 3].includes(Number(r.ruleType))) {
        return false;
      }
      const hasShiftType = r.shiftTypeId !== undefined && r.shiftTypeId !== null;
      const hasAttendance = r.attendanceType !== undefined && r.attendanceType !== null && [0, 1].includes(Number(r.attendanceType));
      return hasShiftType || hasAttendance;
    });

    for (const rule of valid) {
      const insert: any = {
        month_key: monthKey,
        rule_type: Number(rule.ruleType),
        max_count: Number(rule.maxCount),
      };
      if (rule.shiftTypeId !== undefined && rule.shiftTypeId !== null) {
        insert.shift_type_id = Number(rule.shiftTypeId);
      } else if (rule.attendanceType !== undefined && rule.attendanceType !== null) {
        insert.attendance_type = Number(rule.attendanceType);
      }
      const { error } = await this.cloudbase.from('schedule_rules').insert(insert);
      if (error) throw error;
    }

    return this.findAll(monthKey);
  }
}

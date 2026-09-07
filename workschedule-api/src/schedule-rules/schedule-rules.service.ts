import { Injectable } from '@nestjs/common';
import { CloudBaseService } from '../cloudbase/cloudbase.service.js';

export interface ScheduleRuleInput {
  ruleType: number;
  shiftTypeId: number;
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
      shiftTypeId: Number(row.shift_type_id),
      maxCount: Number(row.max_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findAll(monthKey?: string) {
    let builder: any = this.cloudbase
      .from('schedule_rules')
      .select('id,month_key,rule_type,shift_type_id,max_count,created_at,updated_at');
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

    const valid = (rules ?? []).filter(
      (r) => r && r.shiftTypeId && r.maxCount > 0 && [1, 2, 3].includes(Number(r.ruleType)),
    );

    for (const rule of valid) {
      const { error } = await this.cloudbase.from('schedule_rules').insert({
        month_key: monthKey,
        rule_type: Number(rule.ruleType),
        shift_type_id: Number(rule.shiftTypeId),
        max_count: Number(rule.maxCount),
      });
      if (error) throw error;
    }

    return this.findAll(monthKey);
  }
}

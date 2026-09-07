import { Injectable } from '@nestjs/common';
import { CloudBaseService } from '../cloudbase/cloudbase.service.js';

export interface ScheduleWindowInput {
  monthKey: string;
  startAt?: string | null;
  endAt?: string | null;
}

@Injectable()
export class ScheduleWindowsService {
  constructor(private cloudbase: CloudBaseService) {}

  private mapWindow(row: any) {
    if (!row) return null;
    return {
      id: Number(row.id),
      monthKey: row.month_key,
      startAt: row.start_at,
      endAt: row.end_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findByMonth(monthKey: string) {
    const { data, error } = await this.cloudbase
      .from('schedule_windows')
      .select('id,month_key,start_at,end_at,created_at,updated_at')
      .eq('month_key', monthKey)
      .limit(1);
    if (error) throw error;
    return this.mapWindow((data as any[])?.[0]);
  }

  async upsert(input: ScheduleWindowInput) {
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
      if (error) throw error;
    } else {
      const now = new Date().toISOString();
      const { error } = await this.cloudbase.from('schedule_windows').insert({
        month_key: input.monthKey,
        start_at: input.startAt ?? null,
        end_at: input.endAt ?? null,
        created_at: now,
        updated_at: now,
      });
      if (error) throw error;
    }

    return this.findByMonth(input.monthKey);
  }
}

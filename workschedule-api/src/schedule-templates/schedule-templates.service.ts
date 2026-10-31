import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CloudBaseService } from '../cloudbase/cloudbase.service.js';
import { CreateScheduleTemplateDto } from './dto/create-schedule-template.dto.js';
import { UpdateScheduleTemplateDto } from './dto/update-schedule-template.dto.js';

const DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

interface TemplateItemRow {
  userId: number;
  dayOfWeek: number;
  shiftTypeId: number | null;
}

@Injectable()
export class ScheduleTemplatesService {
  constructor(private cloudbase: CloudBaseService) {}

  private mapTemplate(row: any) {
    return {
      id: Number(row.id),
      name: row.name,
      status: Number(row.status),
      templateType: Number(row.template_type ?? 1),
      replaceShiftTypeId: row.replace_shift_type_id ? Number(row.replace_shift_type_id) : null,
      replacedShiftTypeId: row.replaced_shift_type_id ? Number(row.replaced_shift_type_id) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private flattenItems(
    items: CreateScheduleTemplateDto['items'],
  ): TemplateItemRow[] {
    const rows: TemplateItemRow[] = [];
    for (const item of items ?? []) {
      const userId = Number(item.userId);
      if (!userId) continue;
      DAY_KEYS.forEach((key, index) => {
        const shiftTypeId = (item as any)[key];
        if (shiftTypeId !== undefined && shiftTypeId !== null) {
          rows.push({
            userId,
            dayOfWeek: index + 1,
            shiftTypeId: Number(shiftTypeId),
          });
        }
      });
    }
    return rows;
  }

  private groupItems(rows: any[]) {
    const map = new Map<number, Record<string, number | null>>();
    for (const r of rows) {
      const userId = Number(r.user_id);
      if (!map.has(userId)) {
        map.set(userId, {});
      }
      const dayName = DAY_KEYS[Number(r.day_of_week) - 1];
      if (dayName) {
        map.get(userId)![dayName] = r.shift_type_id ? Number(r.shift_type_id) : null;
      }
    }
    return map;
  }

  async create(dto: CreateScheduleTemplateDto) {
    const now = new Date().toISOString();
    const { data: templateRows, error: templateError } = await this.cloudbase
      .from('schedule_templates')
      .insert({
        name: dto.name,
        status: 1,
        template_type: dto.templateType ?? 1,
        replace_shift_type_id: dto.replaceShiftTypeId ?? null,
        replaced_shift_type_id: dto.replacedShiftTypeId ?? null,
        created_at: now,
        updated_at: now,
      })
      .select('id,name,status,template_type,replace_shift_type_id,replaced_shift_type_id,created_at,updated_at');
    if (templateError) throw templateError;
    const template = this.mapTemplate((templateRows as any[])[0]);

    const itemRows = this.flattenItems(dto.items);
    if (itemRows.length > 0) {
      const { error: itemError } = await this.cloudbase
        .from('schedule_template_items')
        .insert(
          itemRows.map((r) => ({
            template_id: template.id,
            user_id: r.userId,
            day_of_week: r.dayOfWeek,
            shift_type_id: r.shiftTypeId,
            created_at: now,
            updated_at: now,
          })),
        );
      if (itemError) throw itemError;
    }

    if (dto.targetUserIds && dto.targetUserIds.length > 0) {
      const { error: targetError } = await this.cloudbase
        .from('schedule_template_target_users')
        .insert(
          dto.targetUserIds.map((uid) => ({
            template_id: template.id,
            user_id: Number(uid),
            created_at: now,
            updated_at: now,
          })),
        );
      if (targetError) throw targetError;
    }

    return this.findOne(BigInt(template.id));
  }

  async findAll(query: { keyword?: string; status?: number }) {
    let builder: any = this.cloudbase
      .from('schedule_templates')
      .select('id,name,status,template_type,replace_shift_type_id,replaced_shift_type_id,created_at,updated_at')
      .order('created_at', { ascending: false });

    if (query.keyword) {
      builder = builder.ilike('name', `%${query.keyword}%`);
    }
    if (query.status !== undefined) {
      builder = builder.eq('status', Number(query.status));
    }

    const { data, error } = await builder;
    if (error) throw error;
    return ((data as any[]) ?? []).map((r) => this.mapTemplate(r));
  }

  async findActiveTemplates() {
    const { data, error } = await this.cloudbase
      .from('schedule_templates')
      .select('id,name,status,template_type,replace_shift_type_id,replaced_shift_type_id,created_at,updated_at')
      .eq('status', 1)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ((data as any[]) ?? []).map((r) => this.mapTemplate(r));
  }

  async findOne(id: bigint) {
    const { data: templateRows, error: templateError } = await this.cloudbase
      .from('schedule_templates')
      .select('id,name,status,template_type,replace_shift_type_id,replaced_shift_type_id,created_at,updated_at')
      .eq('id', Number(id))
      .limit(1);
    if (templateError) throw templateError;
    if (!templateRows || templateRows.length === 0) {
      throw new NotFoundException('模板不存在');
    }
    const template = this.mapTemplate((templateRows as any[])[0]);

    const { data: itemRows, error: itemError } = await this.cloudbase
      .from('schedule_template_items')
      .select('user_id,day_of_week,shift_type_id')
      .eq('template_id', Number(id))
      .order('user_id', { ascending: true });
    if (itemError) throw itemError;

    const grouped = this.groupItems((itemRows as any[]) ?? []);

    const userIds = [...grouped.keys()];
    let userMap = new Map<number, any>();
    if (userIds.length > 0) {
      const { data: userRows, error: userError } = await this.cloudbase
        .from('users')
        .select('id,real_name,username')
        .in('id', userIds);
      if (userError) throw userError;
      userMap = new Map(
        ((userRows as any[]) ?? []).map((u) => [Number(u.id), u]),
      );
    }

    const items = [...grouped.entries()].map(([userId, days]) => {
      const user = userMap.get(userId);
      return {
        userId,
        user: user
          ? {
              id: Number(user.id),
              realName: user.real_name,
              username: user.username,
            }
          : null,
        ...days,
      };
    });

    const { data: targetRows, error: targetError } = await this.cloudbase
      .from('schedule_template_target_users')
      .select('user_id')
      .eq('template_id', Number(id));
    if (targetError) throw targetError;

    const targetUserIds = ((targetRows as any[]) ?? []).map((r) => Number(r.user_id));

    return { ...template, items, targetUserIds };
  }

  async update(id: bigint, dto: UpdateScheduleTemplateDto) {
    await this.findOne(id);

    const update: any = { updated_at: new Date().toISOString() };
    if (dto.name !== undefined) update.name = dto.name;
    if (dto.status !== undefined) update.status = dto.status;
    if (dto.templateType !== undefined) update.template_type = dto.templateType;
    if (dto.replaceShiftTypeId !== undefined) update.replace_shift_type_id = dto.replaceShiftTypeId ?? null;
    if (dto.replacedShiftTypeId !== undefined) update.replaced_shift_type_id = dto.replacedShiftTypeId ?? null;

    if (Object.keys(update).length > 1) {
      const { error } = await this.cloudbase
        .from('schedule_templates')
        .update(update)
        .eq('id', Number(id));
      if (error) throw error;
    }

    if (dto.items !== undefined) {
      const { error: deleteError } = await this.cloudbase
        .from('schedule_template_items')
        .delete()
        .eq('template_id', Number(id));
      if (deleteError) throw deleteError;

      const itemRows = this.flattenItems(dto.items);
      if (itemRows.length > 0) {
        const now = new Date().toISOString();
        const { error: itemError } = await this.cloudbase
          .from('schedule_template_items')
          .insert(
            itemRows.map((r) => ({
              template_id: Number(id),
              user_id: r.userId,
              day_of_week: r.dayOfWeek,
              shift_type_id: r.shiftTypeId,
              created_at: now,
              updated_at: now,
            })),
          );
        if (itemError) throw itemError;
      }
    }

    if (dto.targetUserIds !== undefined) {
      const { error: deleteTargetError } = await this.cloudbase
        .from('schedule_template_target_users')
        .delete()
        .eq('template_id', Number(id));
      if (deleteTargetError) throw deleteTargetError;

      if (dto.targetUserIds.length > 0) {
        const now = new Date().toISOString();
        const { error: targetError } = await this.cloudbase
          .from('schedule_template_target_users')
          .insert(
            dto.targetUserIds.map((uid) => ({
              template_id: Number(id),
              user_id: Number(uid),
              created_at: now,
              updated_at: now,
            })),
          );
        if (targetError) throw targetError;
      }
    }

    return this.findOne(id);
  }

  async remove(id: bigint) {
    await this.findOne(id);

    const { error: deleteItemsError } = await this.cloudbase
      .from('schedule_template_items')
      .delete()
      .eq('template_id', Number(id));
    if (deleteItemsError) throw deleteItemsError;

    const { error: deleteTargetError } = await this.cloudbase
      .from('schedule_template_target_users')
      .delete()
      .eq('template_id', Number(id));
    if (deleteTargetError) throw deleteTargetError;

    const { error } = await this.cloudbase
      .from('schedule_templates')
      .delete()
      .eq('id', Number(id));
    if (error) throw error;

    return { message: '删除成功' };
  }

  async getTemplateItemsForApply(templateId: bigint) {
    const { data: itemRows, error } = await this.cloudbase
      .from('schedule_template_items')
      .select('user_id,day_of_week,shift_type_id')
      .eq('template_id', Number(templateId))
      .order('user_id', { ascending: true });
    if (error) throw error;

    const map = new Map<number, Map<number, number | null>>();
    for (const r of (itemRows as any[]) ?? []) {
      const userId = Number(r.user_id);
      const dayOfWeek = Number(r.day_of_week);
      const shiftTypeId = r.shift_type_id ? Number(r.shift_type_id) : null;
      if (!map.has(userId)) {
        map.set(userId, new Map());
      }
      map.get(userId)!.set(dayOfWeek, shiftTypeId);
    }
    return map;
  }

  async getTemplateTargetUserIds(templateId: bigint) {
    const { data: rows, error } = await this.cloudbase
      .from('schedule_template_target_users')
      .select('user_id')
      .eq('template_id', Number(templateId));
    if (error) throw error;
    return ((rows as any[]) ?? []).map((r) => Number(r.user_id));
  }
}

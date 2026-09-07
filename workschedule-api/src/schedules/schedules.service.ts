import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CloudBaseService } from '../cloudbase/cloudbase.service.js';
import { ScheduleWindowsService } from '../schedule-windows/schedule-windows.service.js';
import { SaveScheduleDto } from './dto/save-schedule.dto.js';

@Injectable()
export class SchedulesService {
  constructor(
    private cloudbase: CloudBaseService,
    private scheduleWindows: ScheduleWindowsService,
  ) {}

  // 检查排班时间窗：返回 { editable, reason }
  private async checkWindow(monthKey: string) {
    const window = await this.scheduleWindows.findByMonth(monthKey);
    // 未配置时间窗的月份默认不可排班
    if (!window) return { editable: false, reason: '该月份未开放排班' };
    const now = new Date();
    if (window.startAt && now < new Date(window.startAt)) {
      return { editable: false, reason: '排班尚未开始' };
    }
    if (window.endAt && now > new Date(window.endAt)) {
      return { editable: false, reason: '排班已结束，不可修改' };
    }
    return { editable: true, reason: '' };
  }

  private formatMonthKey(year: number, month: number) {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  private mapSchedule(row: any, shiftType?: any) {
    return {
      id: Number(row.id),
      userId: Number(row.user_id),
      shiftTypeId: row.shift_type_id ? Number(row.shift_type_id) : null,
      workDate: row.work_date,
      monthKey: row.month_key,
      status: Number(row.status),
      source: Number(row.source),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      shiftType: shiftType
        ? {
            id: Number(shiftType.id),
            name: shiftType.name,
            code: shiftType.code,
            color: shiftType.color,
          }
        : null,
    };
  }

  private async loadShiftTypes(ids: any[]) {
    const uniqueIds = [...new Set(ids.filter(Boolean).map((id) => Number(id)))];
    if (uniqueIds.length === 0) return new Map();

    const { data, error } = await this.cloudbase
      .from('shift_types')
      .select('id,name,code,color,time_range')
      .in('id', uniqueIds);
    if (error) throw error;

    return new Map((data as any[]).map((st) => [Number(st.id), st]));
  }

  async getMySchedules(userId: bigint, year: number, month: number) {
    const monthKey = this.formatMonthKey(year, month);
    const uid = Number(userId);

    const { data: rows, error } = await this.cloudbase
      .from('schedules')
      .select(
        'id,user_id,shift_type_id,work_date,month_key,status,source,created_at,updated_at',
      )
      .eq('user_id', uid)
      .eq('month_key', monthKey)
      .order('work_date', { ascending: true });
    if (error) throw error;

    const shiftTypeMap = await this.loadShiftTypes(
      (rows as any[]).map((r) => r.shift_type_id),
    );

    const schedules = (rows as any[]).map((r) =>
      this.mapSchedule(r, shiftTypeMap.get(Number(r.shift_type_id))),
    );

    const locked = schedules.some((s: any) => s.status === 2);
    const status = locked ? 2 : (schedules[0]?.status ?? 0);

    const windowCheck = await this.checkWindow(monthKey);
    const window = await this.scheduleWindows.findByMonth(monthKey);

    return {
      monthKey,
      status,
      schedules,
      editable: windowCheck.editable && status !== 2,
      lockReason: status === 2 ? '该月份排班已锁定' : windowCheck.reason,
      window: window
        ? { startAt: window.startAt, endAt: window.endAt }
        : null,
    };
  }

  async saveMySchedules(userId: bigint, dto: SaveScheduleDto) {
    const { year, month, items } = dto;
    const monthKey = this.formatMonthKey(year, month);
    const uid = Number(userId);

    const { count, error: lockedError } = await this.cloudbase
      .from('schedules')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('month_key', monthKey)
      .eq('status', 2);
    if (lockedError) throw lockedError;
    if ((count ?? 0) > 0) {
      throw new ForbiddenException('该月份排班已锁定，不可修改');
    }

    const windowCheck = await this.checkWindow(monthKey);
    if (!windowCheck.editable) {
      throw new ForbiddenException(windowCheck.reason);
    }

    const { data: userRows, error: userError } = await this.cloudbase
      .from('users')
      .select('role_id')
      .eq('id', uid)
      .limit(1);
    if (userError) throw userError;
    const roleId = (userRows?.[0] as any)?.role_id;

    const allowedShiftTypeIds = new Set<string>();
    if (roleId) {
      const { data: rstRows, error: rstError } = await this.cloudbase
        .from('role_shift_type')
        .select('shift_type_id')
        .eq('role_id', Number(roleId));
      if (rstError) throw rstError;
      (rstRows as any[])?.forEach((r) =>
        allowedShiftTypeIds.add(String(Number(r.shift_type_id))),
      );
    }

    // 校验所选班次是否在角色允许范围内
    for (const item of items) {
      if (
        item.shiftTypeId &&
        !allowedShiftTypeIds.has(String(Number(item.shiftTypeId)))
      ) {
        throw new BadRequestException(
          `值班类型 ${item.shiftTypeId} 不在角色允许范围内`,
        );
      }
    }

    await this.validateScheduleRules(uid, monthKey, items);
    await this.applyScheduleItems(uid, monthKey, items);

    return this.getMySchedules(userId, year, month);
  }

  // 管理员调整指定人员的排班：不受时间窗和锁定状态限制，
  // 但仍受排班规则（每人每月上限/每天上限/每天下限）约束，保证数据一致。
  async adminSaveUserSchedules(targetUserId: bigint, dto: SaveScheduleDto) {
    const { year, month, items } = dto;
    const monthKey = this.formatMonthKey(year, month);
    const uid = Number(targetUserId);

    const { data: userRows, error: userError } = await this.cloudbase
      .from('users')
      .select('id,is_admin')
      .eq('id', uid)
      .limit(1);
    if (userError) throw userError;
    const target = (userRows?.[0] as any) ?? null;
    if (!target) throw new BadRequestException('人员不存在');
    if (target.is_admin) throw new BadRequestException('不能调整管理员的排班');

    await this.validateScheduleRules(uid, monthKey, items);
    await this.applyScheduleItems(uid, monthKey, items, 2);

    return this.getMySchedules(BigInt(uid), year, month);
  }

  // 按天写入排班项（存在则更新，不存在则插入）。
  // 注意：角色范围校验由调用方负责（管理员调整时不限制班次范围）。
  private async applyScheduleItems(
    uid: number,
    monthKey: string,
    items: SaveScheduleDto['items'],
    source = 0,
  ) {
    for (const item of items) {
      const { data: exists, error: existsError } = await this.cloudbase
        .from('schedules')
        .select('id')
        .eq('user_id', uid)
        .eq('work_date', item.workDate)
        .limit(1);
      if (existsError) throw existsError;

      if (exists && exists.length > 0) {
        const { error: updateError } = await this.cloudbase
          .from('schedules')
          .update({
            shift_type_id: item.shiftTypeId ? Number(item.shiftTypeId) : null,
            month_key: monthKey,
            status: 0,
            source,
            updated_at: new Date().toISOString(),
          })
          .eq('id', Number((exists[0] as any).id));
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await this.cloudbase.from('schedules').insert({
          user_id: uid,
          shift_type_id: item.shiftTypeId ? Number(item.shiftTypeId) : null,
          work_date: item.workDate,
          month_key: monthKey,
          status: 0,
          source,
        });
        if (insertError) throw insertError;
      }
    }
  }

  private async validateScheduleRules(
    uid: number,
    monthKey: string,
    items: { workDate: string; shiftTypeId?: number | null }[],
  ) {
    const { data: ruleRows, error: ruleError } = await this.cloudbase
      .from('schedule_rules')
      .select('rule_type,shift_type_id,max_count')
      .eq('month_key', monthKey);
    if (ruleError) throw ruleError;
    const rules = (ruleRows as any[]) ?? [];
    if (rules.length === 0) return;

    const monthlyRules = rules.filter((r) => Number(r.rule_type) === 1);
    const dailyRules = rules.filter((r) => Number(r.rule_type) === 2);

    // 规则1：每人每月每班次数量上限
    if (monthlyRules.length > 0) {
      const { data: rows, error } = await this.cloudbase
        .from('schedules')
        .select('work_date,shift_type_id')
        .eq('user_id', uid)
        .eq('month_key', monthKey);
      if (error) throw error;

      // 先按日期合并：已有的排班按日期建立映射，本次提交的项覆盖同一天的旧值，避免重复计数
      const byDate = new Map<string, number | null>();
      for (const r of (rows as any[]) ?? []) {
        const d = new Date(r.work_date).toISOString().split('T')[0];
        byDate.set(d, r.shift_type_id ? Number(r.shift_type_id) : null);
      }
      for (const item of items) {
        byDate.set(item.workDate, item.shiftTypeId ? Number(item.shiftTypeId) : null);
      }

      const countMap = new Map<number, number>();
      for (const stId of byDate.values()) {
        if (stId) {
          countMap.set(stId, (countMap.get(stId) ?? 0) + 1);
        }
      }
      for (const rule of monthlyRules) {
        const stId = Number(rule.shift_type_id);
        const maxCount = Number(rule.max_count);
        const current = countMap.get(stId) ?? 0;
        if (current > maxCount) {
          const name = await this.getShiftTypeName(stId);
          throw new BadRequestException(
            `【${name}】每人每月最多排 ${maxCount} 天，当前已排 ${current} 天`,
          );
        }
      }
    }

    // 规则2：每天每班次人数上限
    if (dailyRules.length > 0) {
      for (const item of items) {
        if (!item.shiftTypeId) continue;
        const stId = Number(item.shiftTypeId);
        const rule = dailyRules.find((r) => Number(r.shift_type_id) === stId);
        if (!rule) continue;
        const maxCount = Number(rule.max_count);

        const { data: rows, error } = await this.cloudbase
          .from('schedules')
          .select('user_id,work_date')
          .eq('shift_type_id', stId);
        if (error) throw error;

        const targetDate = new Date(item.workDate).toISOString().split('T')[0];
        const others = ((rows as any[]) ?? []).filter((r) => {
          const d = new Date(r.work_date).toISOString().split('T')[0];
          return d === targetDate && Number(r.user_id) !== uid;
        }).length;
        if (others >= maxCount) {
          const name = await this.getShiftTypeName(stId);
          throw new BadRequestException(
            `${item.workDate} 当天【${name}】最多 ${maxCount} 人，当前已选满`,
          );
        }
      }
    }

    // 规则3：每天每班次人数下限（如每天【A班】>=1 人）
    // 用户未选择该班次时，若其他人已选人数 + 仍未排班人数 < 下限，
    // 说明只剩自己能满足要求，必须选择该班次。
    const minDailyRules = rules.filter((r) => Number(r.rule_type) === 3);
    if (minDailyRules.length > 0) {
      // 启用且非管理员的用户总数（参与排班的人员池）
      const { data: userRows, error: userError } = await this.cloudbase
        .from('users')
        .select('id')
        .eq('status', 1)
        .eq('is_admin', false);
      if (userError) throw userError;
      const totalUsers = ((userRows as any[]) ?? []).length;

      // 本月所有排班（含空班次），按日期在 JS 中过滤
      const { data: monthRows, error: monthError } = await this.cloudbase
        .from('schedules')
        .select('user_id,shift_type_id,work_date')
        .eq('month_key', monthKey);
      if (monthError) throw monthError;
      const allRows = (monthRows as any[]) ?? [];

      for (const item of items) {
        const targetDate = new Date(item.workDate).toISOString().split('T')[0];
        const chosenId = item.shiftTypeId ? Number(item.shiftTypeId) : null;
        const dayRows = allRows.filter(
          (r) => new Date(r.work_date).toISOString().split('T')[0] === targetDate,
        );

        for (const rule of minDailyRules) {
          const stId = Number(rule.shift_type_id);
          const minCount = Number(rule.max_count);
          if (chosenId === stId) continue; // 自己已选该班次，天然满足

          // 其他人中已选该班次的人数
          const selectedByOthers = dayRows.filter(
            (r) => r.shift_type_id && Number(r.shift_type_id) === stId && Number(r.user_id) !== uid,
          ).length;
          // 该日期仍未排班（含空班次）的其他人数量
          const emptyOthers = dayRows.filter(
            (r) => !r.shift_type_id && Number(r.user_id) !== uid,
          ).length;
          // 完全没有该日期记录的其他人数量
          const scheduledUserIds = new Set(dayRows.map((r) => Number(r.user_id)));
          const noRecordOthers = totalUsers - scheduledUserIds.size - (scheduledUserIds.has(uid) ? 0 : 1);

          const remaining = selectedByOthers + emptyOthers + noRecordOthers;
          if (remaining < minCount) {
            const name = await this.getShiftTypeName(stId);
            throw new BadRequestException(
              `${item.workDate} 当天【${name}】至少需要 ${minCount} 人值班，其他人员已无法满足，您必须选择【${name}】`,
            );
          }
        }
      }
    }
  }

  private async getShiftTypeName(shiftTypeId: number) {
    const { data, error } = await this.cloudbase
      .from('shift_types')
      .select('name')
      .eq('id', Number(shiftTypeId))
      .limit(1);
    if (error) throw error;
    return (data?.[0] as any)?.name ?? String(shiftTypeId);
  }

  async submitMySchedules(userId: bigint, year: number, month: number) {
    const monthKey = this.formatMonthKey(year, month);
    const uid = Number(userId);

    const { count, error: countError } = await this.cloudbase
      .from('schedules')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('month_key', monthKey);
    if (countError) throw countError;
    if ((count ?? 0) === 0) {
      throw new BadRequestException('请先填写排班再提交');
    }

    const { error } = await this.cloudbase
      .from('schedules')
      .update({ status: 1 })
      .eq('user_id', uid)
      .eq('month_key', monthKey)
      .eq('status', 0);
    if (error) throw error;

    return this.getMySchedules(userId, year, month);
  }

  async getAllSchedules(
    year: number,
    month: number,
    query?: { roleId?: bigint; shiftTypeId?: bigint },
  ) {
    const monthKey = this.formatMonthKey(year, month);

    let userBuilder: any = this.cloudbase
      .from('users')
      .select('id,real_name,username,role_id,status,is_admin')
      .eq('status', 1)
      .eq('is_admin', false)
      .order('id', { ascending: true });
    if (query?.roleId) {
      userBuilder = userBuilder.eq('role_id', Number(query.roleId));
    }
    const { data: allUserRows, error: userError } = await userBuilder;
    if (userError) throw userError;

    const allUsers = (allUserRows as any[]).map((u) => ({
      id: Number(u.id),
      realName: u.real_name,
      username: u.username,
      roleId: u.role_id ? Number(u.role_id) : null,
      status: u.status,
      isAdmin: u.is_admin,
    }));

    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const userIds = allUsers.map((u) => u.id);

    let scheduleRows: any[] = [];
    if (userIds.length > 0) {
      let builder: any = this.cloudbase
        .from('schedules')
        .select(
          'id,user_id,shift_type_id,work_date,month_key,status,source,created_at,updated_at',
        )
        .eq('month_key', monthKey)
        .in('user_id', userIds);

      if (query?.shiftTypeId) {
        builder = builder.eq('shift_type_id', Number(query.shiftTypeId));
      }

      const { data: rows, error } = await builder.order('work_date', {
        ascending: true,
      });
      if (error) throw error;
      scheduleRows = (rows as any[]) ?? [];
    }

    const allShiftTypeIds = scheduleRows
      .map((r) => r.shift_type_id)
      .filter(Boolean);

    const shiftTypeMap = await this.loadShiftTypes(allShiftTypeIds);

    const grouped: Record<string, any[]> = {};
    for (const r of scheduleRows) {
      const date = new Date(r.work_date).toISOString().split('T')[0];
      if (!grouped[date]) grouped[date] = [];
      const u = userMap.get(Number(r.user_id));
      const st = shiftTypeMap.get(Number(r.shift_type_id));
      grouped[date].push({
        id: Number(r.id),
        workDate: r.work_date,
        status: r.status,
        source: r.source,
        user: u ? { id: u.id, realName: u.realName, username: u.username } : null,
        shiftType: st
          ? {
              id: st.id,
              name: st.name,
              code: st.code,
              color: st.color,
              timeRange: st.time_range,
            }
          : null,
      });
    }

    return { monthKey, users: allUsers, grouped };
  }

  async lockMonth(userId: bigint, year: number, month: number) {
    const monthKey = this.formatMonthKey(year, month);
    const { error } = await this.cloudbase
      .from('schedules')
      .update({ status: 2 })
      .eq('user_id', Number(userId))
      .eq('month_key', monthKey);
    if (error) throw error;
    return { message: '排班已锁定' };
  }

  async unlockMonth(userId: bigint, year: number, month: number) {
    const monthKey = this.formatMonthKey(year, month);
    const { error } = await this.cloudbase
      .from('schedules')
      .update({ status: 0 })
      .eq('user_id', Number(userId))
      .eq('month_key', monthKey);
    if (error) throw error;
    return { message: '排班已解锁' };
  }

  async rejectMonth(userId: bigint, year: number, month: number) {
    const monthKey = this.formatMonthKey(year, month);
    const { error } = await this.cloudbase
      .from('schedules')
      .update({ status: 0 })
      .eq('user_id', Number(userId))
      .eq('month_key', monthKey);
    if (error) throw error;
    return { message: '排班已驳回' };
  }
}

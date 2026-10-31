import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CloudBaseService } from '../cloudbase/cloudbase.service.js';
import { ScheduleWindowsService } from '../schedule-windows/schedule-windows.service.js';
import { ScheduleTemplatesService } from '../schedule-templates/schedule-templates.service.js';
import { SaveScheduleDto } from './dto/save-schedule.dto.js';
import { InitializeScheduleDto } from './dto/initialize-schedule.dto.js';

@Injectable()
export class SchedulesService {
  constructor(
    private cloudbase: CloudBaseService,
    private scheduleWindows: ScheduleWindowsService,
    private scheduleTemplates: ScheduleTemplatesService,
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
            attendanceType: shiftType.attendance_type,
          }
        : null,
    };
  }

  private async loadShiftTypes(ids: any[]) {
    const uniqueIds = [...new Set(ids.filter(Boolean).map((id) => Number(id)))];
    if (uniqueIds.length === 0) return new Map();

    const { data, error } = await this.cloudbase
      .from('shift_types')
      .select('id,name,code,color,time_range,attendance_type')
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

  // 管理员初始化某月排班：支持按统一值班类型初始化，或按有效模板初始化。
  // 该操作会先清空目标人员当月已有排班，再批量插入新记录，因此会覆盖原有数据。
  async initializeSchedules(dto: InitializeScheduleDto) {
    const { year, month, shiftTypeId, templateId } = dto;
    const monthKey = this.formatMonthKey(year, month);

    if (templateId !== undefined) {
      return this.initializeByTemplate(year, month, BigInt(templateId));
    }

    const shiftTypeIdNum = Number(shiftTypeId);

    const { data: shiftTypeRows, error: shiftTypeError } = await this.cloudbase
      .from('shift_types')
      .select('id')
      .eq('id', shiftTypeIdNum)
      .eq('status', 1)
      .limit(1);
    if (shiftTypeError) throw shiftTypeError;
    if (!shiftTypeRows || shiftTypeRows.length === 0) {
      throw new BadRequestException('值班类型不存在或已停用');
    }

    const { data: userRows, error: userError } = await this.cloudbase
      .from('users')
      .select('id')
      .eq('status', 1)
      .eq('is_admin', false)
      .order('id', { ascending: true });
    if (userError) throw userError;

    const users = (userRows as any[]) ?? [];
    if (users.length === 0) {
      return { initializedCount: 0, message: '没有需要初始化的非管理员人员' };
    }

    const userIds = users.map((u) => Number(u.id));

    const daysInMonth = new Date(year, month, 0).getDate();
    const dates: string[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(
        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      );
    }

    // 先清空目标人员当月的所有排班
    const { error: deleteError } = await this.cloudbase
      .from('schedules')
      .delete()
      .in('user_id', userIds)
      .eq('month_key', monthKey);
    if (deleteError) throw deleteError;

    // 生成所有非管理员人员当月的排班记录
    const records: any[] = [];
    for (const uid of userIds) {
      for (const workDate of dates) {
        records.push({
          user_id: uid,
          shift_type_id: shiftTypeIdNum,
          work_date: workDate,
          month_key: monthKey,
          status: 0,
          source: 2,
        });
      }
    }

    // 批量插入，避免单次请求过大
    const batchSize = 500;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error: insertError } = await this.cloudbase
        .from('schedules')
        .insert(batch);
      if (insertError) throw insertError;
    }

    return {
      initializedCount: userIds.length,
      message: `已成功初始化 ${userIds.length} 人的排班`,
    };
  }

  private async initializeByTemplate(
    year: number,
    month: number,
    templateId: bigint,
  ) {
    const monthKey = this.formatMonthKey(year, month);

    const template = await this.scheduleTemplates.findOne(templateId);
    if (template.status !== 1) {
      throw new BadRequestException('模板未生效');
    }

    if (template.templateType === 2) {
      return this.applyRandomTemplate(year, month, monthKey, template);
    }

    return this.applyFixedTemplate(year, month, monthKey, templateId);
  }

  private async applyFixedTemplate(
    year: number,
    month: number,
    monthKey: string,
    templateId: bigint,
  ) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const items: { userId: number; workDate: string; shiftTypeId: number | null }[] = [];
    const userIds: number[] = [];

    const templateItemMap =
      await this.scheduleTemplates.getTemplateItemsForApply(templateId);
    if (templateItemMap.size === 0) {
      return { initializedCount: 0, message: '模板下没有配置排班' };
    }

    for (const [userId, dayMap] of templateItemMap.entries()) {
      userIds.push(userId);
      for (let day = 1; day <= daysInMonth; day++) {
        const workDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dateObj = new Date(year, month - 1, day);
        const dayOfWeek = dateObj.getDay() || 7; // 周日=7
        const shiftTypeId = dayMap.get(dayOfWeek) ?? null;
        items.push({ userId, workDate, shiftTypeId });
      }
    }

    // 按月上限规则自动裁剪：超出规则数量时，从日期较大的开始不初始化
    await this.capTemplateItemsByMonthlyRules(monthKey, items);

    // 校验排班规则（规则约束强于模板）
    await this.validateAllScheduleRules(monthKey, items);

    // 清空模板涉及人员当月的所有排班
    const { error: deleteError } = await this.cloudbase
      .from('schedules')
      .delete()
      .in('user_id', userIds)
      .eq('month_key', monthKey);
    if (deleteError) throw deleteError;

    // 批量插入模板排班
    const records = items.map((item) => ({
      user_id: item.userId,
      shift_type_id: item.shiftTypeId,
      work_date: item.workDate,
      month_key: monthKey,
      status: 0,
      source: 2,
    }));

    const batchSize = 500;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error: insertError } = await this.cloudbase.from('schedules').insert(batch);
      if (insertError) throw insertError;
    }

    return {
      initializedCount: userIds.length,
      message: `已按模板初始化 ${userIds.length} 人的排班`,
    };
  }

  private async applyRandomTemplate(
    year: number,
    month: number,
    monthKey: string,
    template: any,
  ) {
    if (!template.replaceShiftTypeId || !template.replacedShiftTypeId) {
      throw new BadRequestException('随机模板需要设置替换值班类型和被替换值班类型');
    }

    const targetUserIds = await this.scheduleTemplates.getTemplateTargetUserIds(
      BigInt(template.id),
    );

    let effectiveUserIds: number[] = [];
    if (targetUserIds.length > 0) {
      const { data: userRows, error: userError } = await this.cloudbase
        .from('users')
        .select('id')
        .eq('status', 1)
        .eq('is_admin', false)
        .in('id', targetUserIds);
      if (userError) throw userError;
      effectiveUserIds = ((userRows as any[]) ?? []).map((u) => Number(u.id));
    } else {
      const { data: userRows, error: userError } = await this.cloudbase
        .from('users')
        .select('id')
        .eq('status', 1)
        .eq('is_admin', false);
      if (userError) throw userError;
      effectiveUserIds = ((userRows as any[]) ?? []).map((u) => Number(u.id));
    }

    if (effectiveUserIds.length === 0) {
      return { initializedCount: 0, message: '没有符合条件的用户' };
    }

    const { data: scheduleRows, error: scheduleError } = await this.cloudbase
      .from('schedules')
      .select('id,user_id,work_date,shift_type_id')
      .eq('month_key', monthKey)
      .in('user_id', effectiveUserIds);
    if (scheduleError) throw scheduleError;

    const replacedShiftTypeId = Number(template.replacedShiftTypeId);
    const replaceShiftTypeId = Number(template.replaceShiftTypeId);

    // 按日期分组
    const byDate = new Map<string, any[]>();
    for (const r of (scheduleRows as any[]) ?? []) {
      const date = new Date(r.work_date).toISOString().split('T')[0];
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date)!.push(r);
    }

    // 均匀分布：每天优先选择当月累计被替换次数最少的人员
    const replacedCount = new Map<number, number>();
    for (const userId of effectiveUserIds) {
      replacedCount.set(userId, 0);
    }

    const toUpdate: { id: number; workDate: string }[] = [];
    let prevUserId: number | null = null;
    for (let day = 1; day <= new Date(year, month, 0).getDate(); day++) {
      const workDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const rows = byDate.get(workDate) ?? [];
      const candidates = rows.filter((r) => Number(r.shift_type_id) === replacedShiftTypeId);
      if (candidates.length === 0) continue;

      const minCount = Math.min(
        ...candidates.map((r) => replacedCount.get(Number(r.user_id)) ?? 0),
      );
      let bestCandidates = candidates.filter(
        (r) => (replacedCount.get(Number(r.user_id)) ?? 0) === minCount,
      );

      // 尽量避免连续两天都选同一个人
      const nonConsecutive = bestCandidates.filter((r) => Number(r.user_id) !== prevUserId);
      if (nonConsecutive.length > 0) {
        bestCandidates = nonConsecutive;
      }

      const randomIndex = Math.floor(Math.random() * bestCandidates.length);
      const target = bestCandidates[randomIndex];
      const targetUserId = Number(target.user_id);
      toUpdate.push({ id: Number(target.id), workDate });
      replacedCount.set(targetUserId, (replacedCount.get(targetUserId) ?? 0) + 1);
      prevUserId = targetUserId;
    }

    for (const item of toUpdate) {
      const { error: updateError } = await this.cloudbase
        .from('schedules')
        .update({
          shift_type_id: replaceShiftTypeId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);
      if (updateError) throw updateError;
    }

    return {
      initializedCount: toUpdate.length,
      message: `已随机覆盖 ${toUpdate.length} 天的排班`,
    };
  }

  // 管理员清空某月排班：删除所有启用且非管理员人员当月的排班记录。
  async clearAllSchedules(year: number, month: number) {
    const monthKey = this.formatMonthKey(year, month);

    const { data: userRows, error: userError } = await this.cloudbase
      .from('users')
      .select('id')
      .eq('status', 1)
      .eq('is_admin', false);
    if (userError) throw userError;

    const userIds = ((userRows as any[]) ?? []).map((u) => Number(u.id));
    if (userIds.length === 0) {
      return { clearedCount: 0, message: '没有需要清空的非管理员人员' };
    }

    const { error } = await this.cloudbase
      .from('schedules')
      .delete()
      .in('user_id', userIds)
      .eq('month_key', monthKey);
    if (error) throw error;

    return {
      clearedCount: userIds.length,
      message: `已清空 ${userIds.length} 人的排班`,
    };
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
      .select('rule_type,shift_type_id,attendance_type,max_count')
      .eq('month_key', monthKey);
    if (ruleError) throw ruleError;
    const rules = (ruleRows as any[]) ?? [];
    if (rules.length === 0) return;

    // 加载所有班次，建立 id -> 考勤类型 映射
    const { data: shiftTypeRows, error: stError } = await this.cloudbase
      .from('shift_types')
      .select('id,name,attendance_type');
    if (stError) throw stError;
    const shiftTypeMap = new Map<number, { name: string; attendanceType: number }>();
    for (const st of (shiftTypeRows as any[]) ?? []) {
      shiftTypeMap.set(Number(st.id), {
        name: st.name,
        attendanceType: Number(st.attendance_type),
      });
    }
    const attendanceOf = (stId: number | null) => {
      if (!stId) return null;
      return shiftTypeMap.get(Number(stId))?.attendanceType ?? null;
    };
    const nameOf = (stId: number) => shiftTypeMap.get(Number(stId))?.name ?? String(stId);
    const attendanceName = (type: number) => (type === 1 ? '工作' : '休息');

    const monthlyRules = rules.filter((r) => Number(r.rule_type) === 1);
    const dailyRules = rules.filter((r) => Number(r.rule_type) === 2);
    const minDailyRules = rules.filter((r) => Number(r.rule_type) === 3);

    // 规则1：每人每月数量上限（按班次 或 按考勤）
    if (monthlyRules.length > 0) {
      const { data: rows, error } = await this.cloudbase
        .from('schedules')
        .select('work_date,shift_type_id')
        .eq('user_id', uid)
        .eq('month_key', monthKey);
      if (error) throw error;

      const byDate = new Map<string, number | null>();
      for (const r of (rows as any[]) ?? []) {
        const d = new Date(r.work_date).toISOString().split('T')[0];
        byDate.set(d, r.shift_type_id ? Number(r.shift_type_id) : null);
      }
      for (const item of items) {
        byDate.set(item.workDate, item.shiftTypeId ? Number(item.shiftTypeId) : null);
      }

      const countByShiftType = new Map<number, number>();
      const countByAttendance = new Map<number, number>();
      for (const stId of byDate.values()) {
        if (stId) {
          countByShiftType.set(stId, (countByShiftType.get(stId) ?? 0) + 1);
          const at = attendanceOf(stId);
          if (at !== null) {
            countByAttendance.set(at, (countByAttendance.get(at) ?? 0) + 1);
          }
        }
      }

      for (const rule of monthlyRules) {
        const maxCount = Number(rule.max_count);
        if (rule.shift_type_id) {
          const stId = Number(rule.shift_type_id);
          const current = countByShiftType.get(stId) ?? 0;
          if (current > maxCount) {
            throw new BadRequestException(
              `【${nameOf(stId)}】每人每月最多排 ${maxCount} 天，当前已排 ${current} 天`,
            );
          }
        } else if (rule.attendance_type !== null && rule.attendance_type !== undefined) {
          const at = Number(rule.attendance_type);
          const current = countByAttendance.get(at) ?? 0;
          if (current > maxCount) {
            throw new BadRequestException(
              `【${attendanceName(at)}】每人每月最多排 ${maxCount} 天，当前已排 ${current} 天`,
            );
          }
        }
      }
    }

    // 规则2：每天人数上限（按班次 或 按考勤）
    if (dailyRules.length > 0) {
      for (const item of items) {
        const targetDate = new Date(item.workDate).toISOString().split('T')[0];
        const { data: rows, error } = await this.cloudbase
          .from('schedules')
          .select('user_id,work_date,shift_type_id')
          .eq('work_date', targetDate);
        if (error) throw error;

        for (const rule of dailyRules) {
          const maxCount = Number(rule.max_count);
          if (rule.shift_type_id) {
            const stId = Number(rule.shift_type_id);
            if (Number(item.shiftTypeId) !== stId) continue;
            const others = ((rows as any[]) ?? []).filter((r) => {
              const d = new Date(r.work_date).toISOString().split('T')[0];
              return d === targetDate && Number(r.shift_type_id) === stId && Number(r.user_id) !== uid;
            }).length;
            if (others >= maxCount) {
              throw new BadRequestException(
                `${item.workDate} 当天【${nameOf(stId)}】最多 ${maxCount} 人，当前已选满`,
              );
            }
          } else if (rule.attendance_type !== null && rule.attendance_type !== undefined) {
            const at = Number(rule.attendance_type);
            if (attendanceOf(item.shiftTypeId ?? null) !== at) continue;
            const others = ((rows as any[]) ?? []).filter((r) => {
              const d = new Date(r.work_date).toISOString().split('T')[0];
              return (
                d === targetDate &&
                Number(r.user_id) !== uid &&
                attendanceOf(r.shift_type_id ? Number(r.shift_type_id) : null) === at
              );
            }).length;
            if (others >= maxCount) {
              throw new BadRequestException(
                `${item.workDate} 当天【${attendanceName(at)}】最多 ${maxCount} 人，当前已选满`,
              );
            }
          }
        }
      }
    }

    // 规则3：每天人数下限（按班次 或 按考勤）
    if (minDailyRules.length > 0) {
      const { data: userRows, error: userError } = await this.cloudbase
        .from('users')
        .select('id')
        .eq('status', 1)
        .eq('is_admin', false);
      if (userError) throw userError;
      const totalUsers = ((userRows as any[]) ?? []).length;

      const { data: monthRows, error: monthError } = await this.cloudbase
        .from('schedules')
        .select('user_id,shift_type_id,work_date')
        .eq('month_key', monthKey);
      if (monthError) throw monthError;
      const allRows = (monthRows as any[]) ?? [];

      for (const item of items) {
        const targetDate = new Date(item.workDate).toISOString().split('T')[0];
        const chosenId = item.shiftTypeId ? Number(item.shiftTypeId) : null;
        const chosenAt = attendanceOf(chosenId);
        const dayRows = allRows.filter(
          (r) => new Date(r.work_date).toISOString().split('T')[0] === targetDate,
        );

        for (const rule of minDailyRules) {
          const minCount = Number(rule.max_count);
          if (rule.shift_type_id) {
            const stId = Number(rule.shift_type_id);
            if (chosenId === stId) continue;

            const selectedByOthers = dayRows.filter(
              (r) => r.shift_type_id && Number(r.shift_type_id) === stId && Number(r.user_id) !== uid,
            ).length;
            const emptyOthers = dayRows.filter(
              (r) => !r.shift_type_id && Number(r.user_id) !== uid,
            ).length;
            const scheduledUserIds = new Set(dayRows.map((r) => Number(r.user_id)));
            const noRecordOthers = totalUsers - scheduledUserIds.size - (scheduledUserIds.has(uid) ? 0 : 1);

            const remaining = selectedByOthers + emptyOthers + noRecordOthers;
            if (remaining < minCount) {
              throw new BadRequestException(
                `${item.workDate} 当天【${nameOf(stId)}】至少需要 ${minCount} 人值班，其他人员已无法满足，您必须选择【${nameOf(stId)}】`,
              );
            }
          } else if (rule.attendance_type !== null && rule.attendance_type !== undefined) {
            const at = Number(rule.attendance_type);
            if (chosenAt === at) continue;

            const selectedByOthers = dayRows.filter(
              (r) =>
                attendanceOf(r.shift_type_id ? Number(r.shift_type_id) : null) === at &&
                Number(r.user_id) !== uid,
            ).length;
            const emptyOthers = dayRows.filter(
              (r) => !r.shift_type_id && Number(r.user_id) !== uid,
            ).length;
            const scheduledUserIds = new Set(dayRows.map((r) => Number(r.user_id)));
            const noRecordOthers = totalUsers - scheduledUserIds.size - (scheduledUserIds.has(uid) ? 0 : 1);

            const remaining = selectedByOthers + emptyOthers + noRecordOthers;
            if (remaining < minCount) {
              throw new BadRequestException(
                `${item.workDate} 当天【${attendanceName(at)}】至少需要 ${minCount} 人值班，其他人员已无法满足，您必须选择【${attendanceName(at)}】`,
              );
            }
          }
        }
      }
    }
  }

  // 模板初始化时按月上限规则自动裁剪：超出规则数量时，从日期较大的开始不初始化。
  private async capTemplateItemsByMonthlyRules(
    monthKey: string,
    items: { userId: number; workDate: string; shiftTypeId: number | null }[],
  ) {
    const { data: ruleRows, error: ruleError } = await this.cloudbase
      .from('schedule_rules')
      .select('rule_type,shift_type_id,attendance_type,max_count')
      .eq('month_key', monthKey);
    if (ruleError) throw ruleError;
    const rules = (ruleRows as any[]) ?? [];
    const monthlyRules = rules.filter((r) => Number(r.rule_type) === 1);
    if (monthlyRules.length === 0) return;

    const { data: shiftTypeRows, error: stError } = await this.cloudbase
      .from('shift_types')
      .select('id,attendance_type');
    if (stError) throw stError;
    const attendanceMap = new Map<number, number>();
    for (const st of (shiftTypeRows as any[]) ?? []) {
      attendanceMap.set(Number(st.id), Number(st.attendance_type));
    }
    const attendanceOf = (stId: number | null) => {
      if (!stId) return null;
      return attendanceMap.get(Number(stId)) ?? null;
    };

    const maxLoops = items.length;
    for (let loop = 0; loop < maxLoops; loop++) {
      let changed = false;

      for (const rule of monthlyRules) {
        const maxCount = Number(rule.max_count);
        const targetStId = rule.shift_type_id ? Number(rule.shift_type_id) : null;
        const targetAt =
          rule.attendance_type !== null && rule.attendance_type !== undefined
            ? Number(rule.attendance_type)
            : null;

        const countByUser = new Map<
          number,
          { indices: number[]; count: number }
        >();

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.shiftTypeId === null) continue;

          let match = false;
          if (targetStId !== null && Number(item.shiftTypeId) === targetStId) {
            match = true;
          }
          if (!match && targetAt !== null && attendanceOf(item.shiftTypeId) === targetAt) {
            match = true;
          }
          if (!match) continue;

          if (!countByUser.has(item.userId)) {
            countByUser.set(item.userId, { indices: [], count: 0 });
          }
          const entry = countByUser.get(item.userId)!;
          entry.indices.push(i);
          entry.count++;
        }

        for (const [, entry] of countByUser.entries()) {
          if (entry.count <= maxCount) continue;
          const toRemove = entry.count - maxCount;
          // 按日期降序，移除日期较大的
          const sortedIndices = entry.indices
            .map((idx) => ({ idx, workDate: items[idx].workDate }))
            .sort((a, b) => (a.workDate > b.workDate ? -1 : 1));
          for (let i = 0; i < toRemove && i < sortedIndices.length; i++) {
            items[sortedIndices[i].idx].shiftTypeId = null;
            changed = true;
          }
        }
      }

      if (!changed) break;
    }
  }

  // 全量校验：用于模板初始化等多用户批量场景。
  // 假设当前月份只有传入的 items（覆盖式写入），校验是否满足排班规则。
  private async validateAllScheduleRules(
    monthKey: string,
    items: { userId: number; workDate: string; shiftTypeId: number | null }[],
  ) {
    const { data: ruleRows, error: ruleError } = await this.cloudbase
      .from('schedule_rules')
      .select('rule_type,shift_type_id,attendance_type,max_count')
      .eq('month_key', monthKey);
    if (ruleError) throw ruleError;
    const rules = (ruleRows as any[]) ?? [];
    if (rules.length === 0) return;

    const { data: shiftTypeRows, error: stError } = await this.cloudbase
      .from('shift_types')
      .select('id,name,attendance_type');
    if (stError) throw stError;
    const shiftTypeMap = new Map<number, { name: string; attendanceType: number }>();
    for (const st of (shiftTypeRows as any[]) ?? []) {
      shiftTypeMap.set(Number(st.id), {
        name: st.name,
        attendanceType: Number(st.attendance_type),
      });
    }
    const attendanceOf = (stId: number | null) => {
      if (!stId) return null;
      return shiftTypeMap.get(Number(stId))?.attendanceType ?? null;
    };
    const nameOf = (stId: number) => shiftTypeMap.get(Number(stId))?.name ?? String(stId);
    const attendanceName = (type: number) => (type === 1 ? '工作' : '休息');

    const monthlyRules = rules.filter((r) => Number(r.rule_type) === 1);
    const dailyRules = rules.filter((r) => Number(r.rule_type) === 2);
    const minDailyRules = rules.filter((r) => Number(r.rule_type) === 3);

    // 规则1：每人每月数量上限（按班次 或 按考勤）
    if (monthlyRules.length > 0) {
      const countByUserShiftType = new Map<number, Map<number, number>>();
      const countByUserAttendance = new Map<number, Map<number, number>>();

      for (const item of items) {
        const uid = item.userId;
        const stId = item.shiftTypeId;
        if (!stId) continue;

        if (!countByUserShiftType.has(uid)) {
          countByUserShiftType.set(uid, new Map());
          countByUserAttendance.set(uid, new Map());
        }
        const stMap = countByUserShiftType.get(uid)!;
        stMap.set(stId, (stMap.get(stId) ?? 0) + 1);

        const at = attendanceOf(stId);
        if (at !== null) {
          const atMap = countByUserAttendance.get(uid)!;
          atMap.set(at, (atMap.get(at) ?? 0) + 1);
        }
      }

      for (const rule of monthlyRules) {
        const maxCount = Number(rule.max_count);
        if (rule.shift_type_id) {
          const stId = Number(rule.shift_type_id);
          for (const [uid, stMap] of countByUserShiftType.entries()) {
            const current = stMap.get(stId) ?? 0;
            if (current > maxCount) {
              throw new BadRequestException(
                `【${nameOf(stId)}】每人每月最多排 ${maxCount} 天，用户 ${uid} 当前已排 ${current} 天`,
              );
            }
          }
        } else if (rule.attendance_type !== null && rule.attendance_type !== undefined) {
          const at = Number(rule.attendance_type);
          for (const [uid, atMap] of countByUserAttendance.entries()) {
            const current = atMap.get(at) ?? 0;
            if (current > maxCount) {
              throw new BadRequestException(
                `【${attendanceName(at)}】每人每月最多排 ${maxCount} 天，用户 ${uid} 当前已排 ${current} 天`,
              );
            }
          }
        }
      }
    }

    // 规则2：每天人数上限（按班次 或 按考勤）
    if (dailyRules.length > 0) {
      const countByDateShiftType = new Map<string, Map<number, number>>();
      const countByDateAttendance = new Map<string, Map<number, number>>();

      for (const item of items) {
        const date = item.workDate;
        const stId = item.shiftTypeId;
        if (!stId) continue;

        if (!countByDateShiftType.has(date)) {
          countByDateShiftType.set(date, new Map());
          countByDateAttendance.set(date, new Map());
        }
        const stMap = countByDateShiftType.get(date)!;
        stMap.set(stId, (stMap.get(stId) ?? 0) + 1);

        const at = attendanceOf(stId);
        if (at !== null) {
          const atMap = countByDateAttendance.get(date)!;
          atMap.set(at, (atMap.get(at) ?? 0) + 1);
        }
      }

      for (const rule of dailyRules) {
        const maxCount = Number(rule.max_count);
        if (rule.shift_type_id) {
          const stId = Number(rule.shift_type_id);
          for (const [date, stMap] of countByDateShiftType.entries()) {
            const current = stMap.get(stId) ?? 0;
            if (current > maxCount) {
              throw new BadRequestException(
                `${date} 当天【${nameOf(stId)}】最多 ${maxCount} 人，当前已排 ${current} 人`,
              );
            }
          }
        } else if (rule.attendance_type !== null && rule.attendance_type !== undefined) {
          const at = Number(rule.attendance_type);
          for (const [date, atMap] of countByDateAttendance.entries()) {
            const current = atMap.get(at) ?? 0;
            if (current > maxCount) {
              throw new BadRequestException(
                `${date} 当天【${attendanceName(at)}】最多 ${maxCount} 人，当前已排 ${current} 人`,
              );
            }
          }
        }
      }
    }

    // 规则3：每天人数下限（按班次 或 按考勤）
    if (minDailyRules.length > 0) {
      const { data: userRows, error: userError } = await this.cloudbase
        .from('users')
        .select('id')
        .eq('status', 1)
        .eq('is_admin', false);
      if (userError) throw userError;
      const totalUsers = ((userRows as any[]) ?? []).length;

      const countByDateShiftType = new Map<string, Map<number, number>>();
      const countByDateAttendance = new Map<string, Map<number, number>>();
      const usersByDate = new Map<string, Set<number>>();
      const emptyByDate = new Map<string, number>();

      for (const item of items) {
        const date = item.workDate;
        const uid = item.userId;
        const stId = item.shiftTypeId;

        if (!usersByDate.has(date)) {
          usersByDate.set(date, new Set());
          emptyByDate.set(date, 0);
          countByDateShiftType.set(date, new Map());
          countByDateAttendance.set(date, new Map());
        }
        usersByDate.get(date)!.add(uid);

        if (!stId) {
          emptyByDate.set(date, (emptyByDate.get(date) ?? 0) + 1);
          continue;
        }

        const stMap = countByDateShiftType.get(date)!;
        stMap.set(stId, (stMap.get(stId) ?? 0) + 1);

        const at = attendanceOf(stId);
        if (at !== null) {
          const atMap = countByDateAttendance.get(date)!;
          atMap.set(at, (atMap.get(at) ?? 0) + 1);
        }
      }

      for (const rule of minDailyRules) {
        const minCount = Number(rule.max_count);
        if (rule.shift_type_id) {
          const stId = Number(rule.shift_type_id);
          for (const date of usersByDate.keys()) {
            const selected = countByDateShiftType.get(date)?.get(stId) ?? 0;
            const empty = emptyByDate.get(date) ?? 0;
            const scheduledCount = usersByDate.get(date)?.size ?? 0;
            const noRecord = totalUsers - scheduledCount;
            const remaining = selected + empty + noRecord;
            if (remaining < minCount) {
              throw new BadRequestException(
                `${date} 当天【${nameOf(stId)}】至少需要 ${minCount} 人值班，当前无法满足`,
              );
            }
          }
        } else if (rule.attendance_type !== null && rule.attendance_type !== undefined) {
          const at = Number(rule.attendance_type);
          for (const date of usersByDate.keys()) {
            const selected = countByDateAttendance.get(date)?.get(at) ?? 0;
            const empty = emptyByDate.get(date) ?? 0;
            const scheduledCount = usersByDate.get(date)?.size ?? 0;
            const noRecord = totalUsers - scheduledCount;
            const remaining = selected + empty + noRecord;
            if (remaining < minCount) {
              throw new BadRequestException(
                `${date} 当天【${attendanceName(at)}】至少需要 ${minCount} 人值班，当前无法满足`,
              );
            }
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

    const window = await this.scheduleWindows.findByMonth(monthKey);
    const now = new Date();
    const isEnded = !!window?.endAt && now > new Date(window.endAt);

    let userBuilder: any = this.cloudbase
      .from('users')
      .select('id,real_name,username,role_id,status,is_admin')
      .eq('is_admin', false)
      .order('id', { ascending: true });
    if (!isEnded) {
      userBuilder = userBuilder.eq('status', 1);
    }
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

  async clearUserSchedules(userId: bigint, year: number, month: number) {
    const monthKey = this.formatMonthKey(year, month);
    const uid = Number(userId);

    const { data: userRows, error: userError } = await this.cloudbase
      .from('users')
      .select('id,is_admin')
      .eq('id', uid)
      .limit(1);
    if (userError) throw userError;
    const target = (userRows?.[0] as any) ?? null;
    if (!target) throw new BadRequestException('人员不存在');
    if (target.is_admin) throw new BadRequestException('不能清除管理员的排班');

    const { error } = await this.cloudbase
      .from('schedules')
      .delete()
      .eq('user_id', uid)
      .eq('month_key', monthKey);
    if (error) throw error;

    return { message: '排班已清除' };
  }
}

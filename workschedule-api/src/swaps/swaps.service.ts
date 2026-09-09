import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CloudBaseService } from '../cloudbase/cloudbase.service.js';
import { ScheduleWindowsService } from '../schedule-windows/schedule-windows.service.js';
import { CreateSwapDto } from './dto/create-swap.dto.js';

@Injectable()
export class SwapsService {
  constructor(
    private cloudbase: CloudBaseService,
    private scheduleWindows: ScheduleWindowsService,
  ) {}

  private async assertWindowEditable(monthKey: string) {
    const window = await this.scheduleWindows.findByMonth(monthKey);
    // 未配置时间窗的月份默认不可换班
    if (!window) throw new ForbiddenException('该月份未开放排班，不能换班');
    const now = new Date();
    if (window.startAt && now < new Date(window.startAt)) {
      throw new ForbiddenException('排班尚未开始，不能换班');
    }
    if (window.endAt && now > new Date(window.endAt)) {
      throw new ForbiddenException('排班已结束，不能换班');
    }
  }

  private mapRawSwap(sw: any) {
    return {
      id: Number(sw.id),
      applicantId: Number(sw.applicant_id),
      applicantScheduleId: Number(sw.applicant_schedule_id),
      targetUserId: sw.target_user_id ? Number(sw.target_user_id) : null,
      targetScheduleId: sw.target_schedule_id ? Number(sw.target_schedule_id) : null,
      swapType: Number(sw.swap_type),
      reason: sw.reason,
      status: Number(sw.status),
      adminApproved: sw.admin_approved,
      createdAt: sw.created_at,
      updatedAt: sw.updated_at,
      resolvedAt: sw.resolved_at,
    };
  }

  private async enrichSwaps(swaps: any[]) {
    if (swaps.length === 0) return [];

    const applicantIds = [
      ...new Set(swaps.map((s) => Number(s.applicant_id)).filter(Boolean)),
    ];
    const targetUserIds = [
      ...new Set(swaps.map((s) => Number(s.target_user_id)).filter(Boolean)),
    ];
    const applicantScheduleIds = [
      ...new Set(swaps.map((s) => Number(s.applicant_schedule_id)).filter(Boolean)),
    ];
    const targetScheduleIds = [
      ...new Set(swaps.map((s) => Number(s.target_schedule_id)).filter(Boolean)),
    ];
    const scheduleIds = [
      ...new Set([...applicantScheduleIds, ...targetScheduleIds]),
    ];

    const userIds = [...new Set([...applicantIds, ...targetUserIds])];
    const { data: userRows, error: userError } = await this.cloudbase
      .from('users')
      .select('id,real_name')
      .in('id', userIds);
    if (userError) throw userError;
    const userMap = new Map((userRows as any[]).map((u) => [Number(u.id), u]));

    const { data: scheduleRows, error: scheduleError } = await this.cloudbase
      .from('schedules')
      .select('id,work_date,shift_type_id')
      .in('id', scheduleIds);
    if (scheduleError) throw scheduleError;

    const shiftTypeIds = (scheduleRows as any[])
      .map((s) => Number(s.shift_type_id))
      .filter(Boolean);
    const shiftTypeMap = await this.loadShiftTypes(shiftTypeIds);
    const scheduleMap = new Map(
      (scheduleRows as any[]).map((s) => [
        Number(s.id),
        {
          id: Number(s.id),
          workDate: s.work_date,
          shiftType: s.shift_type_id
            ? shiftTypeMap.get(Number(s.shift_type_id)) ?? null
            : null,
        },
      ]),
    );

    return swaps.map((sw) => {
      const base = this.mapRawSwap(sw);
      return {
        ...base,
        applicant: (() => {
          const uid = Number(sw.applicant_id);
          const u = userMap.get(uid);
          return { id: uid, realName: u?.real_name };
        })(),
        targetUser: sw.target_user_id
          ? (() => {
              const uid = Number(sw.target_user_id);
              const u = userMap.get(uid);
              return { id: uid, realName: u?.real_name };
            })()
          : null,
        applicantSchedule: scheduleMap.get(Number(sw.applicant_schedule_id)),
        targetSchedule: sw.target_schedule_id
          ? scheduleMap.get(Number(sw.target_schedule_id))
          : null,
      };
    });
  }

  private async loadShiftTypes(ids: any[]) {
    const uniqueIds = [...new Set(ids.filter(Boolean).map((id) => Number(id)))];
    if (uniqueIds.length === 0) return new Map();

    const { data, error } = await this.cloudbase
      .from('shift_types')
      .select('id,name,color')
      .in('id', uniqueIds);
    if (error) throw error;

    return new Map((data as any[]).map((st) => [Number(st.id), st]));
  }

  private async fetchSwapById(id: bigint) {
    const { data, error } = await this.cloudbase
      .from('shift_swaps')
      .select('*')
      .eq('id', Number(id))
      .limit(1);
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new NotFoundException('换班申请不存在');
    }
    const enriched = await this.enrichSwaps([data[0]]);
    return enriched[0];
  }

  async create(applicantId: bigint, dto: CreateSwapDto) {
    const { data: applicantRows, error: aError } = await this.cloudbase
      .from('schedules')
      .select('id,user_id,shift_type_id,status,month_key')
      .eq('id', Number(dto.applicantScheduleId))
      .limit(1);
    if (aError) throw aError;
    if (
      !applicantRows ||
      applicantRows.length === 0 ||
      Number((applicantRows[0] as any).user_id) !== Number(applicantId)
    ) {
      throw new ForbiddenException('只能发起自己的排班换班');
    }
    const applicantSchedule = applicantRows[0] as any;
    if (!applicantSchedule.shift_type_id) {
      throw new BadRequestException('休息日期不能发起换班');
    }
    await this.assertWindowEditable(applicantSchedule.month_key);

    let targetSchedule: any = null;
    if (dto.targetScheduleId && dto.targetUserId) {
      const { data: targetRows, error: tError } = await this.cloudbase
        .from('schedules')
        .select('id,user_id,shift_type_id,status,month_key')
        .eq('id', Number(dto.targetScheduleId))
        .limit(1);
      if (tError) throw tError;
      if (
        !targetRows ||
        targetRows.length === 0 ||
        Number((targetRows[0] as any).user_id) !== Number(dto.targetUserId)
      ) {
        throw new BadRequestException('目标排班信息不正确');
      }
      targetSchedule = targetRows[0] as any;
      if (!targetSchedule.shift_type_id) {
        throw new BadRequestException('对方休息日期不能换班');
      }
      await this.assertWindowEditable(targetSchedule.month_key);
    }

    const orFilter = dto.targetScheduleId
      ? `applicant_schedule_id.eq.${Number(dto.applicantScheduleId)},target_schedule_id.eq.${Number(dto.targetScheduleId)}`
      : `applicant_schedule_id.eq.${Number(dto.applicantScheduleId)}`;
    const { data: pendingRows, error: pendingError } = await this.cloudbase
      .from('shift_swaps')
      .select('id,status')
      .or(orFilter);
    if (pendingError) throw pendingError;
    const inProgressStatuses = new Set([0, 1, 4]);
    const hasInProgress = ((pendingRows as any[]) ?? []).some((r) =>
      inProgressStatuses.has(Number(r.status)),
    );
    if (hasInProgress) {
      throw new BadRequestException('当前日期存在进行中的换班申请');
    }

    const applicantMonthLocked = applicantSchedule.status === 2;
    const targetMonthLocked = targetSchedule?.status === 2;

    const { error } = await this.cloudbase.from('shift_swaps').insert({
      applicant_id: Number(applicantId),
      applicant_schedule_id: Number(dto.applicantScheduleId),
      target_user_id: dto.targetUserId ? Number(dto.targetUserId) : null,
      target_schedule_id: dto.targetScheduleId ? Number(dto.targetScheduleId) : null,
      swap_type: Number(dto.swapType),
      reason: dto.reason && dto.reason.trim().length > 0 ? dto.reason.trim() : null,
      status: applicantMonthLocked || targetMonthLocked ? 4 : 0,
    });
    if (error) throw error;

    return { message: '换班申请已发起' };
  }

  async findByUser(userId: bigint) {
    const [{ data: appliedRows, error: aErr }, { data: receivedRows, error: rErr }] =
      await Promise.all([
        this.cloudbase
          .from('shift_swaps')
          .select('*')
          .eq('applicant_id', Number(userId))
          .order('created_at', { ascending: false }),
        this.cloudbase
          .from('shift_swaps')
          .select('*')
          .eq('target_user_id', Number(userId))
          .in('status', [0, 4])
          .order('created_at', { ascending: false }),
      ]);
    if (aErr) throw aErr;
    if (rErr) throw rErr;

    const applied = await this.enrichSwaps((appliedRows as any[]) ?? []);
    const received = await this.enrichSwaps((receivedRows as any[]) ?? []);

    return { applied, received };
  }

  async findAllNonAdmin() {
    const { data: userRows, error: userError } = await this.cloudbase
      .from('users')
      .select('id')
      .eq('is_admin', false);
    if (userError) throw userError;

    const userIds = ((userRows as any[]) ?? [])
      .map((u) => Number(u.id))
      .filter(Boolean);
    if (userIds.length === 0) return { all: [] };

    const ids = userIds.join(',');
    const { data: swapRows, error } = await this.cloudbase
      .from('shift_swaps')
      .select('*')
      .or(`applicant_id.in.(${ids}),target_user_id.in.(${ids})`)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const all = await this.enrichSwaps((swapRows as any[]) ?? []);
    return { all };
  }

  async remove(id: bigint) {
    const { data, error } = await this.cloudbase
      .from('shift_swaps')
      .select('id')
      .eq('id', Number(id))
      .limit(1);
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new NotFoundException('换班申请不存在');
    }

    const { error: deleteError } = await this.cloudbase
      .from('shift_swaps')
      .delete()
      .eq('id', Number(id));
    if (deleteError) throw deleteError;

    return { message: '删除成功' };
  }

  async approve(id: bigint, currentUserId: bigint) {
    const swap = await this.fetchSwapById(id);
    if (swap.targetUserId !== Number(currentUserId)) {
      throw new ForbiddenException('只有被申请人可以同意');
    }
    if (swap.status !== 0 && swap.status !== 4) {
      throw new BadRequestException('该申请状态不可操作');
    }

    if (swap.status === 4) {
      const { error } = await this.cloudbase
        .from('shift_swaps')
        .update({ status: 1 })
        .eq('id', Number(id));
      if (error) throw error;
      return { message: '已同意，等待管理员审批' };
    }

    return this.executeSwap(swap);
  }

  async adminApprove(id: bigint, adminId: bigint, approved: boolean) {
    const swap = await this.fetchSwapById(id);
    if (swap.status !== 4) {
      throw new BadRequestException('申请状态不正确');
    }

    if (approved) {
      return this.executeSwap(swap, true);
    }

    const { error } = await this.cloudbase
      .from('shift_swaps')
      .update({
        status: 2,
        admin_approved: false,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', Number(id));
    if (error) throw error;
    return { message: '已驳回' };
  }

  async reject(id: bigint, currentUserId: bigint) {
    const { data, error } = await this.cloudbase
      .from('shift_swaps')
      .select('target_user_id,status')
      .eq('id', Number(id))
      .limit(1);
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new NotFoundException('换班申请不存在');
    }
    const row = data[0] as any;
    if (Number(row.target_user_id) !== Number(currentUserId)) {
      throw new ForbiddenException('无权限操作');
    }
    if (row.status !== 0 && row.status !== 4) {
      throw new BadRequestException('该申请状态不可操作');
    }

    const { error: updateError } = await this.cloudbase
      .from('shift_swaps')
      .update({ status: 2, resolved_at: new Date().toISOString() })
      .eq('id', Number(id));
    if (updateError) throw updateError;
    return { message: '已拒绝' };
  }

  async withdraw(id: bigint, currentUserId: bigint) {
    const { data, error } = await this.cloudbase
      .from('shift_swaps')
      .select('applicant_id,status')
      .eq('id', Number(id))
      .limit(1);
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new NotFoundException('换班申请不存在');
    }
    const row = data[0] as any;
    if (Number(row.applicant_id) !== Number(currentUserId)) {
      throw new ForbiddenException('只能撤回自己发起的申请');
    }
    if (row.status !== 0 && row.status !== 4) {
      throw new BadRequestException('该申请状态不可撤回');
    }

    const { error: updateError } = await this.cloudbase
      .from('shift_swaps')
      .update({ status: 3, resolved_at: new Date().toISOString() })
      .eq('id', Number(id));
    if (updateError) throw updateError;
    return { message: '已撤回' };
  }

  // 换班执行前的排班规则校验：模拟交换后的结果，检查规则1/2/3。
  // 必须在 executeSwap 内、真正改库之前调用（发起时不校验，
  // 因为发起后到其他人员排班变化，提前校验不可靠）。
  private async assertSwapRules(swap: any) {
    const app = swap.applicantSchedule;
    const tgt = swap.targetSchedule;
    if (!app || !tgt) return;

    const dayOf = (d: string) => new Date(d).toISOString().split('T')[0];
    const appDate = dayOf(app.workDate);
    const tgtDate = dayOf(tgt.workDate);
    const appMonth = appDate.slice(0, 7);
    const tgtMonth = tgtDate.slice(0, 7);
    const appUserId = Number(swap.applicantId);
    const tgtUserId = Number(swap.targetUserId);
    // 交换后：申请人得到对方的班次，对方得到申请人的班次
    const appNewSt = tgt.shiftType ? Number(tgt.shiftType.id) : null;
    const tgtNewSt = app.shiftType ? Number(app.shiftType.id) : null;

    const months = [...new Set([appMonth, tgtMonth])];
    const { data: ruleRows, error: ruleError } = await this.cloudbase
      .from('schedule_rules')
      .select('month_key,rule_type,shift_type_id,max_count')
      .in('month_key', months);
    if (ruleError) throw ruleError;
    const rules = ((ruleRows as any[]) ?? []).filter((r) =>
      months.includes(String(r.month_key)),
    );
    if (rules.length === 0) return;

    const { data: schedRows, error: schedError } = await this.cloudbase
      .from('schedules')
      .select('user_id,shift_type_id,work_date,month_key')
      .in('month_key', months);
    if (schedError) throw schedError;
    const rows = (schedRows as any[]) ?? [];

    // 交换后某一天的 用户->班次 映射
    const dayMapAfterSwap = (date: string) => {
      const m = new Map<number, number | null>();
      for (const r of rows) {
        if (dayOf(r.work_date) === date) {
          m.set(Number(r.user_id), r.shift_type_id ? Number(r.shift_type_id) : null);
        }
      }
      m.set(appUserId, appDate === date ? appNewSt : m.get(appUserId) ?? null);
      m.set(tgtUserId, tgtDate === date ? tgtNewSt : m.get(tgtUserId) ?? null);
      return m;
    };

    const shiftTypeIds = [
      ...new Set(rules.map((r) => Number(r.shift_type_id)).filter(Boolean)),
    ];
    const nameMap = await this.loadShiftTypes(shiftTypeIds);
    const nameOf = (id: number) => nameMap.get(id)?.name ?? String(id);

    // 规则2（每天每班次人数上限）与规则3（每天每班次人数下限）：
    // 只有交换涉及的两个日期的构成会变化，只检查这两天
    for (const date of [appDate, tgtDate]) {
      const dateMonth = date.slice(0, 7);
      const m = dayMapAfterSwap(date);
      for (const rule of rules) {
        if (String(rule.month_key) !== dateMonth) continue;
        const stId = Number(rule.shift_type_id);
        const count = [...m.values()].filter((v) => v === stId).length;
        if (Number(rule.rule_type) === 2 && count > Number(rule.max_count)) {
          throw new BadRequestException(
            `${date} 当天【${nameOf(stId)}】最多 ${rule.max_count} 人，换班后将超出限制`,
          );
        }
        if (Number(rule.rule_type) === 3 && count < Number(rule.max_count)) {
          throw new BadRequestException(
            `${date} 当天【${nameOf(stId)}】至少需要 ${rule.max_count} 人值班，换班后将无法满足`,
          );
        }
      }
    }

    // 规则1（每人每月每班次数量上限）：分别检查双方在自己月份交换后的数量
    const monthCountAfterSwap = (
      userId: number,
      month: string,
      overrideDate: string,
      overrideSt: number | null,
    ) => {
      const counts = new Map<number, number>();
      for (const r of rows) {
        if (String(r.month_key) !== month || Number(r.user_id) !== userId) continue;
        const d = dayOf(r.work_date);
        const st =
          d === overrideDate
            ? overrideSt
            : r.shift_type_id
              ? Number(r.shift_type_id)
              : null;
        if (st) counts.set(st, (counts.get(st) ?? 0) + 1);
      }
      return counts;
    };

    const parties = [
      { userId: appUserId, month: appMonth, date: appDate, st: appNewSt },
      { userId: tgtUserId, month: tgtMonth, date: tgtDate, st: tgtNewSt },
    ];
    for (const p of parties) {
      const counts = monthCountAfterSwap(p.userId, p.month, p.date, p.st);
      for (const rule of rules) {
        if (Number(rule.rule_type) !== 1 || String(rule.month_key) !== p.month) continue;
        const stId = Number(rule.shift_type_id);
        const count = counts.get(stId) ?? 0;
        if (count > Number(rule.max_count)) {
          throw new BadRequestException(
            `【${nameOf(stId)}】每人每月最多排 ${rule.max_count} 天，换班后将超出限制`,
          );
        }
      }
    }
  }

  private async executeSwap(swap: any, adminApproved = false) {
    if (!swap.targetSchedule) {
      throw new BadRequestException('公开换班需先被指定对象认领');
    }

    const monthKeyOf = (workDate: string) =>
      new Date(workDate).toISOString().split('T')[0].slice(0, 7);
    await this.assertWindowEditable(monthKeyOf(swap.applicantSchedule.workDate));
    await this.assertWindowEditable(monthKeyOf(swap.targetSchedule.workDate));
    await this.assertSwapRules(swap);

    const applicantShiftTypeId = swap.applicantSchedule?.shiftType?.id ?? null;
    const targetShiftTypeId = swap.targetSchedule?.shiftType?.id ?? null;

    const now = new Date().toISOString();

    const { error: err1 } = await this.cloudbase
      .from('schedules')
      .update({
        shift_type_id: targetShiftTypeId,
        source: 1,
        status: 0,
        updated_at: now,
      })
      .eq('id', Number(swap.applicantScheduleId));
    if (err1) throw err1;

    const { error: err2 } = await this.cloudbase
      .from('schedules')
      .update({
        shift_type_id: applicantShiftTypeId,
        source: 1,
        status: 0,
        updated_at: now,
      })
      .eq('id', Number(swap.targetScheduleId));
    if (err2) throw err2;

    const { error: err3 } = await this.cloudbase
      .from('shift_swaps')
      .update({
        status: 5,
        admin_approved: adminApproved,
        resolved_at: now,
      })
      .eq('id', Number(swap.id));
    if (err3) throw err3;

    return { message: '换班成功' };
  }
}

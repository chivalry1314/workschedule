var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, BadRequestException, NotFoundException, ForbiddenException, } from '@nestjs/common';
import { CloudBaseService } from '../cloudbase/cloudbase.service.js';
import { ScheduleWindowsService } from '../schedule-windows/schedule-windows.service.js';
let SwapsService = class SwapsService {
    cloudbase;
    scheduleWindows;
    constructor(cloudbase, scheduleWindows) {
        this.cloudbase = cloudbase;
        this.scheduleWindows = scheduleWindows;
    }
    async assertWindowEditable(monthKey) {
        const window = await this.scheduleWindows.findByMonth(monthKey);
        if (!window)
            throw new ForbiddenException('该月份未开放排班，不能换班');
        const now = new Date();
        if (window.startAt && now < new Date(window.startAt)) {
            throw new ForbiddenException('排班尚未开始，不能换班');
        }
        if (window.endAt && now > new Date(window.endAt)) {
            throw new ForbiddenException('排班已结束，不能换班');
        }
    }
    mapRawSwap(sw) {
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
    async enrichSwaps(swaps) {
        if (swaps.length === 0)
            return [];
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
        if (userError)
            throw userError;
        const userMap = new Map(userRows.map((u) => [Number(u.id), u]));
        const { data: scheduleRows, error: scheduleError } = await this.cloudbase
            .from('schedules')
            .select('id,work_date,shift_type_id')
            .in('id', scheduleIds);
        if (scheduleError)
            throw scheduleError;
        const shiftTypeIds = scheduleRows
            .map((s) => Number(s.shift_type_id))
            .filter(Boolean);
        const shiftTypeMap = await this.loadShiftTypes(shiftTypeIds);
        const scheduleMap = new Map(scheduleRows.map((s) => [
            Number(s.id),
            {
                id: Number(s.id),
                workDate: s.work_date,
                shiftType: s.shift_type_id
                    ? shiftTypeMap.get(Number(s.shift_type_id)) ?? null
                    : null,
            },
        ]));
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
    async loadShiftTypes(ids) {
        const uniqueIds = [...new Set(ids.filter(Boolean).map((id) => Number(id)))];
        if (uniqueIds.length === 0)
            return new Map();
        const { data, error } = await this.cloudbase
            .from('shift_types')
            .select('id,name,color')
            .in('id', uniqueIds);
        if (error)
            throw error;
        return new Map(data.map((st) => [Number(st.id), st]));
    }
    async fetchSwapById(id) {
        const { data, error } = await this.cloudbase
            .from('shift_swaps')
            .select('*')
            .eq('id', Number(id))
            .limit(1);
        if (error)
            throw error;
        if (!data || data.length === 0) {
            throw new NotFoundException('换班申请不存在');
        }
        const enriched = await this.enrichSwaps([data[0]]);
        return enriched[0];
    }
    async create(applicantId, dto) {
        const { data: applicantRows, error: aError } = await this.cloudbase
            .from('schedules')
            .select('id,user_id,shift_type_id,status,month_key')
            .eq('id', Number(dto.applicantScheduleId))
            .limit(1);
        if (aError)
            throw aError;
        if (!applicantRows ||
            applicantRows.length === 0 ||
            Number(applicantRows[0].user_id) !== Number(applicantId)) {
            throw new ForbiddenException('只能发起自己的排班换班');
        }
        const applicantSchedule = applicantRows[0];
        if (!applicantSchedule.shift_type_id) {
            throw new BadRequestException('休息日期不能发起换班');
        }
        await this.assertWindowEditable(applicantSchedule.month_key);
        let targetSchedule = null;
        if (dto.targetScheduleId && dto.targetUserId) {
            const { data: targetRows, error: tError } = await this.cloudbase
                .from('schedules')
                .select('id,user_id,shift_type_id,status,month_key')
                .eq('id', Number(dto.targetScheduleId))
                .limit(1);
            if (tError)
                throw tError;
            if (!targetRows ||
                targetRows.length === 0 ||
                Number(targetRows[0].user_id) !== Number(dto.targetUserId)) {
                throw new BadRequestException('目标排班信息不正确');
            }
            targetSchedule = targetRows[0];
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
        if (pendingError)
            throw pendingError;
        const inProgressStatuses = new Set([0, 1, 4]);
        const hasInProgress = (pendingRows ?? []).some((r) => inProgressStatuses.has(Number(r.status)));
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
        if (error)
            throw error;
        return { message: '换班申请已发起' };
    }
    async findByUser(userId) {
        const [{ data: appliedRows, error: aErr }, { data: receivedRows, error: rErr }] = await Promise.all([
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
        if (aErr)
            throw aErr;
        if (rErr)
            throw rErr;
        const applied = await this.enrichSwaps(appliedRows ?? []);
        const received = await this.enrichSwaps(receivedRows ?? []);
        return { applied, received };
    }
    async approve(id, currentUserId) {
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
            if (error)
                throw error;
            return { message: '已同意，等待管理员审批' };
        }
        return this.executeSwap(swap);
    }
    async adminApprove(id, adminId, approved) {
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
        if (error)
            throw error;
        return { message: '已驳回' };
    }
    async reject(id, currentUserId) {
        const { data, error } = await this.cloudbase
            .from('shift_swaps')
            .select('target_user_id,status')
            .eq('id', Number(id))
            .limit(1);
        if (error)
            throw error;
        if (!data || data.length === 0) {
            throw new NotFoundException('换班申请不存在');
        }
        const row = data[0];
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
        if (updateError)
            throw updateError;
        return { message: '已拒绝' };
    }
    async withdraw(id, currentUserId) {
        const { data, error } = await this.cloudbase
            .from('shift_swaps')
            .select('applicant_id,status')
            .eq('id', Number(id))
            .limit(1);
        if (error)
            throw error;
        if (!data || data.length === 0) {
            throw new NotFoundException('换班申请不存在');
        }
        const row = data[0];
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
        if (updateError)
            throw updateError;
        return { message: '已撤回' };
    }
    async assertSwapRules(swap) {
        const app = swap.applicantSchedule;
        const tgt = swap.targetSchedule;
        if (!app || !tgt)
            return;
        const dayOf = (d) => new Date(d).toISOString().split('T')[0];
        const appDate = dayOf(app.workDate);
        const tgtDate = dayOf(tgt.workDate);
        const appMonth = appDate.slice(0, 7);
        const tgtMonth = tgtDate.slice(0, 7);
        const appUserId = Number(swap.applicantId);
        const tgtUserId = Number(swap.targetUserId);
        const appNewSt = tgt.shiftType ? Number(tgt.shiftType.id) : null;
        const tgtNewSt = app.shiftType ? Number(app.shiftType.id) : null;
        const months = [...new Set([appMonth, tgtMonth])];
        const { data: ruleRows, error: ruleError } = await this.cloudbase
            .from('schedule_rules')
            .select('month_key,rule_type,shift_type_id,max_count')
            .in('month_key', months);
        if (ruleError)
            throw ruleError;
        const rules = (ruleRows ?? []).filter((r) => months.includes(String(r.month_key)));
        if (rules.length === 0)
            return;
        const { data: schedRows, error: schedError } = await this.cloudbase
            .from('schedules')
            .select('user_id,shift_type_id,work_date,month_key')
            .in('month_key', months);
        if (schedError)
            throw schedError;
        const rows = schedRows ?? [];
        const dayMapAfterSwap = (date) => {
            const m = new Map();
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
        const nameOf = (id) => nameMap.get(id)?.name ?? String(id);
        for (const date of [appDate, tgtDate]) {
            const dateMonth = date.slice(0, 7);
            const m = dayMapAfterSwap(date);
            for (const rule of rules) {
                if (String(rule.month_key) !== dateMonth)
                    continue;
                const stId = Number(rule.shift_type_id);
                const count = [...m.values()].filter((v) => v === stId).length;
                if (Number(rule.rule_type) === 2 && count > Number(rule.max_count)) {
                    throw new BadRequestException(`${date} 当天【${nameOf(stId)}】最多 ${rule.max_count} 人，换班后将超出限制`);
                }
                if (Number(rule.rule_type) === 3 && count < Number(rule.max_count)) {
                    throw new BadRequestException(`${date} 当天【${nameOf(stId)}】至少需要 ${rule.max_count} 人值班，换班后将无法满足`);
                }
            }
        }
        const monthCountAfterSwap = (userId, month, overrideDate, overrideSt) => {
            const counts = new Map();
            for (const r of rows) {
                if (String(r.month_key) !== month || Number(r.user_id) !== userId)
                    continue;
                const d = dayOf(r.work_date);
                const st = d === overrideDate
                    ? overrideSt
                    : r.shift_type_id
                        ? Number(r.shift_type_id)
                        : null;
                if (st)
                    counts.set(st, (counts.get(st) ?? 0) + 1);
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
                if (Number(rule.rule_type) !== 1 || String(rule.month_key) !== p.month)
                    continue;
                const stId = Number(rule.shift_type_id);
                const count = counts.get(stId) ?? 0;
                if (count > Number(rule.max_count)) {
                    throw new BadRequestException(`【${nameOf(stId)}】每人每月最多排 ${rule.max_count} 天，换班后将超出限制`);
                }
            }
        }
    }
    async executeSwap(swap, adminApproved = false) {
        if (!swap.targetSchedule) {
            throw new BadRequestException('公开换班需先被指定对象认领');
        }
        const monthKeyOf = (workDate) => new Date(workDate).toISOString().split('T')[0].slice(0, 7);
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
        if (err1)
            throw err1;
        const { error: err2 } = await this.cloudbase
            .from('schedules')
            .update({
            shift_type_id: applicantShiftTypeId,
            source: 1,
            status: 0,
            updated_at: now,
        })
            .eq('id', Number(swap.targetScheduleId));
        if (err2)
            throw err2;
        const { error: err3 } = await this.cloudbase
            .from('shift_swaps')
            .update({
            status: 5,
            admin_approved: adminApproved,
            resolved_at: now,
        })
            .eq('id', Number(swap.id));
        if (err3)
            throw err3;
        return { message: '换班成功' };
    }
};
SwapsService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [CloudBaseService,
        ScheduleWindowsService])
], SwapsService);
export { SwapsService };
//# sourceMappingURL=swaps.service.js.map
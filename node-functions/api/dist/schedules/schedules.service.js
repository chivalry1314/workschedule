var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, BadRequestException, ForbiddenException, } from '@nestjs/common';
import { CloudBaseService } from '../cloudbase/cloudbase.service.js';
import { ScheduleWindowsService } from '../schedule-windows/schedule-windows.service.js';
let SchedulesService = class SchedulesService {
    cloudbase;
    scheduleWindows;
    constructor(cloudbase, scheduleWindows) {
        this.cloudbase = cloudbase;
        this.scheduleWindows = scheduleWindows;
    }
    async checkWindow(monthKey) {
        const window = await this.scheduleWindows.findByMonth(monthKey);
        if (!window)
            return { editable: false, reason: '该月份未开放排班' };
        const now = new Date();
        if (window.startAt && now < new Date(window.startAt)) {
            return { editable: false, reason: '排班尚未开始' };
        }
        if (window.endAt && now > new Date(window.endAt)) {
            return { editable: false, reason: '排班已结束，不可修改' };
        }
        return { editable: true, reason: '' };
    }
    formatMonthKey(year, month) {
        return `${year}-${String(month).padStart(2, '0')}`;
    }
    mapSchedule(row, shiftType) {
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
    async loadShiftTypes(ids) {
        const uniqueIds = [...new Set(ids.filter(Boolean).map((id) => Number(id)))];
        if (uniqueIds.length === 0)
            return new Map();
        const { data, error } = await this.cloudbase
            .from('shift_types')
            .select('id,name,code,color,time_range,attendance_type')
            .in('id', uniqueIds);
        if (error)
            throw error;
        return new Map(data.map((st) => [Number(st.id), st]));
    }
    async getMySchedules(userId, year, month) {
        const monthKey = this.formatMonthKey(year, month);
        const uid = Number(userId);
        const { data: rows, error } = await this.cloudbase
            .from('schedules')
            .select('id,user_id,shift_type_id,work_date,month_key,status,source,created_at,updated_at')
            .eq('user_id', uid)
            .eq('month_key', monthKey)
            .order('work_date', { ascending: true });
        if (error)
            throw error;
        const shiftTypeMap = await this.loadShiftTypes(rows.map((r) => r.shift_type_id));
        const schedules = rows.map((r) => this.mapSchedule(r, shiftTypeMap.get(Number(r.shift_type_id))));
        const locked = schedules.some((s) => s.status === 2);
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
    async saveMySchedules(userId, dto) {
        const { year, month, items } = dto;
        const monthKey = this.formatMonthKey(year, month);
        const uid = Number(userId);
        const { count, error: lockedError } = await this.cloudbase
            .from('schedules')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', uid)
            .eq('month_key', monthKey)
            .eq('status', 2);
        if (lockedError)
            throw lockedError;
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
        if (userError)
            throw userError;
        const roleId = userRows?.[0]?.role_id;
        const allowedShiftTypeIds = new Set();
        if (roleId) {
            const { data: rstRows, error: rstError } = await this.cloudbase
                .from('role_shift_type')
                .select('shift_type_id')
                .eq('role_id', Number(roleId));
            if (rstError)
                throw rstError;
            rstRows?.forEach((r) => allowedShiftTypeIds.add(String(Number(r.shift_type_id))));
        }
        for (const item of items) {
            if (item.shiftTypeId &&
                !allowedShiftTypeIds.has(String(Number(item.shiftTypeId)))) {
                throw new BadRequestException(`值班类型 ${item.shiftTypeId} 不在角色允许范围内`);
            }
        }
        await this.validateScheduleRules(uid, monthKey, items);
        await this.applyScheduleItems(uid, monthKey, items);
        return this.getMySchedules(userId, year, month);
    }
    async adminSaveUserSchedules(targetUserId, dto) {
        const { year, month, items } = dto;
        const monthKey = this.formatMonthKey(year, month);
        const uid = Number(targetUserId);
        const { data: userRows, error: userError } = await this.cloudbase
            .from('users')
            .select('id,is_admin')
            .eq('id', uid)
            .limit(1);
        if (userError)
            throw userError;
        const target = userRows?.[0] ?? null;
        if (!target)
            throw new BadRequestException('人员不存在');
        if (target.is_admin)
            throw new BadRequestException('不能调整管理员的排班');
        await this.validateScheduleRules(uid, monthKey, items);
        await this.applyScheduleItems(uid, monthKey, items, 2);
        return this.getMySchedules(BigInt(uid), year, month);
    }
    async initializeSchedules(dto) {
        const { year, month, shiftTypeId } = dto;
        const monthKey = this.formatMonthKey(year, month);
        const shiftTypeIdNum = Number(shiftTypeId);
        const { data: shiftTypeRows, error: shiftTypeError } = await this.cloudbase
            .from('shift_types')
            .select('id')
            .eq('id', shiftTypeIdNum)
            .eq('status', 1)
            .limit(1);
        if (shiftTypeError)
            throw shiftTypeError;
        if (!shiftTypeRows || shiftTypeRows.length === 0) {
            throw new BadRequestException('值班类型不存在或已停用');
        }
        const { data: userRows, error: userError } = await this.cloudbase
            .from('users')
            .select('id')
            .eq('status', 1)
            .eq('is_admin', false)
            .order('id', { ascending: true });
        if (userError)
            throw userError;
        const users = userRows ?? [];
        if (users.length === 0) {
            return { initializedCount: 0, message: '没有需要初始化的非管理员人员' };
        }
        const userIds = users.map((u) => Number(u.id));
        const daysInMonth = new Date(year, month, 0).getDate();
        const dates = [];
        for (let day = 1; day <= daysInMonth; day++) {
            dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
        }
        const { error: deleteError } = await this.cloudbase
            .from('schedules')
            .delete()
            .in('user_id', userIds)
            .eq('month_key', monthKey);
        if (deleteError)
            throw deleteError;
        const records = [];
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
        const batchSize = 500;
        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            const { error: insertError } = await this.cloudbase
                .from('schedules')
                .insert(batch);
            if (insertError)
                throw insertError;
        }
        return {
            initializedCount: userIds.length,
            message: `已成功初始化 ${userIds.length} 人的排班`,
        };
    }
    async clearAllSchedules(year, month) {
        const monthKey = this.formatMonthKey(year, month);
        const { data: userRows, error: userError } = await this.cloudbase
            .from('users')
            .select('id')
            .eq('status', 1)
            .eq('is_admin', false);
        if (userError)
            throw userError;
        const userIds = (userRows ?? []).map((u) => Number(u.id));
        if (userIds.length === 0) {
            return { clearedCount: 0, message: '没有需要清空的非管理员人员' };
        }
        const { error } = await this.cloudbase
            .from('schedules')
            .delete()
            .in('user_id', userIds)
            .eq('month_key', monthKey);
        if (error)
            throw error;
        return {
            clearedCount: userIds.length,
            message: `已清空 ${userIds.length} 人的排班`,
        };
    }
    async applyScheduleItems(uid, monthKey, items, source = 0) {
        for (const item of items) {
            const { data: exists, error: existsError } = await this.cloudbase
                .from('schedules')
                .select('id')
                .eq('user_id', uid)
                .eq('work_date', item.workDate)
                .limit(1);
            if (existsError)
                throw existsError;
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
                    .eq('id', Number(exists[0].id));
                if (updateError)
                    throw updateError;
            }
            else {
                const { error: insertError } = await this.cloudbase.from('schedules').insert({
                    user_id: uid,
                    shift_type_id: item.shiftTypeId ? Number(item.shiftTypeId) : null,
                    work_date: item.workDate,
                    month_key: monthKey,
                    status: 0,
                    source,
                });
                if (insertError)
                    throw insertError;
            }
        }
    }
    async validateScheduleRules(uid, monthKey, items) {
        const { data: ruleRows, error: ruleError } = await this.cloudbase
            .from('schedule_rules')
            .select('rule_type,shift_type_id,attendance_type,max_count')
            .eq('month_key', monthKey);
        if (ruleError)
            throw ruleError;
        const rules = ruleRows ?? [];
        if (rules.length === 0)
            return;
        const { data: shiftTypeRows, error: stError } = await this.cloudbase
            .from('shift_types')
            .select('id,name,attendance_type');
        if (stError)
            throw stError;
        const shiftTypeMap = new Map();
        for (const st of shiftTypeRows ?? []) {
            shiftTypeMap.set(Number(st.id), {
                name: st.name,
                attendanceType: Number(st.attendance_type),
            });
        }
        const attendanceOf = (stId) => {
            if (!stId)
                return null;
            return shiftTypeMap.get(Number(stId))?.attendanceType ?? null;
        };
        const nameOf = (stId) => shiftTypeMap.get(Number(stId))?.name ?? String(stId);
        const attendanceName = (type) => (type === 1 ? '工作' : '休息');
        const monthlyRules = rules.filter((r) => Number(r.rule_type) === 1);
        const dailyRules = rules.filter((r) => Number(r.rule_type) === 2);
        const minDailyRules = rules.filter((r) => Number(r.rule_type) === 3);
        if (monthlyRules.length > 0) {
            const { data: rows, error } = await this.cloudbase
                .from('schedules')
                .select('work_date,shift_type_id')
                .eq('user_id', uid)
                .eq('month_key', monthKey);
            if (error)
                throw error;
            const byDate = new Map();
            for (const r of rows ?? []) {
                const d = new Date(r.work_date).toISOString().split('T')[0];
                byDate.set(d, r.shift_type_id ? Number(r.shift_type_id) : null);
            }
            for (const item of items) {
                byDate.set(item.workDate, item.shiftTypeId ? Number(item.shiftTypeId) : null);
            }
            const countByShiftType = new Map();
            const countByAttendance = new Map();
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
                        throw new BadRequestException(`【${nameOf(stId)}】每人每月最多排 ${maxCount} 天，当前已排 ${current} 天`);
                    }
                }
                else if (rule.attendance_type !== null && rule.attendance_type !== undefined) {
                    const at = Number(rule.attendance_type);
                    const current = countByAttendance.get(at) ?? 0;
                    if (current > maxCount) {
                        throw new BadRequestException(`【${attendanceName(at)}】每人每月最多排 ${maxCount} 天，当前已排 ${current} 天`);
                    }
                }
            }
        }
        if (dailyRules.length > 0) {
            for (const item of items) {
                const targetDate = new Date(item.workDate).toISOString().split('T')[0];
                const { data: rows, error } = await this.cloudbase
                    .from('schedules')
                    .select('user_id,work_date,shift_type_id')
                    .eq('work_date', targetDate);
                if (error)
                    throw error;
                for (const rule of dailyRules) {
                    const maxCount = Number(rule.max_count);
                    if (rule.shift_type_id) {
                        const stId = Number(rule.shift_type_id);
                        if (Number(item.shiftTypeId) !== stId)
                            continue;
                        const others = (rows ?? []).filter((r) => {
                            const d = new Date(r.work_date).toISOString().split('T')[0];
                            return d === targetDate && Number(r.shift_type_id) === stId && Number(r.user_id) !== uid;
                        }).length;
                        if (others >= maxCount) {
                            throw new BadRequestException(`${item.workDate} 当天【${nameOf(stId)}】最多 ${maxCount} 人，当前已选满`);
                        }
                    }
                    else if (rule.attendance_type !== null && rule.attendance_type !== undefined) {
                        const at = Number(rule.attendance_type);
                        if (attendanceOf(item.shiftTypeId ?? null) !== at)
                            continue;
                        const others = (rows ?? []).filter((r) => {
                            const d = new Date(r.work_date).toISOString().split('T')[0];
                            return (d === targetDate &&
                                Number(r.user_id) !== uid &&
                                attendanceOf(r.shift_type_id ? Number(r.shift_type_id) : null) === at);
                        }).length;
                        if (others >= maxCount) {
                            throw new BadRequestException(`${item.workDate} 当天【${attendanceName(at)}】最多 ${maxCount} 人，当前已选满`);
                        }
                    }
                }
            }
        }
        if (minDailyRules.length > 0) {
            const { data: userRows, error: userError } = await this.cloudbase
                .from('users')
                .select('id')
                .eq('status', 1)
                .eq('is_admin', false);
            if (userError)
                throw userError;
            const totalUsers = (userRows ?? []).length;
            const { data: monthRows, error: monthError } = await this.cloudbase
                .from('schedules')
                .select('user_id,shift_type_id,work_date')
                .eq('month_key', monthKey);
            if (monthError)
                throw monthError;
            const allRows = monthRows ?? [];
            for (const item of items) {
                const targetDate = new Date(item.workDate).toISOString().split('T')[0];
                const chosenId = item.shiftTypeId ? Number(item.shiftTypeId) : null;
                const chosenAt = attendanceOf(chosenId);
                const dayRows = allRows.filter((r) => new Date(r.work_date).toISOString().split('T')[0] === targetDate);
                for (const rule of minDailyRules) {
                    const minCount = Number(rule.max_count);
                    if (rule.shift_type_id) {
                        const stId = Number(rule.shift_type_id);
                        if (chosenId === stId)
                            continue;
                        const selectedByOthers = dayRows.filter((r) => r.shift_type_id && Number(r.shift_type_id) === stId && Number(r.user_id) !== uid).length;
                        const emptyOthers = dayRows.filter((r) => !r.shift_type_id && Number(r.user_id) !== uid).length;
                        const scheduledUserIds = new Set(dayRows.map((r) => Number(r.user_id)));
                        const noRecordOthers = totalUsers - scheduledUserIds.size - (scheduledUserIds.has(uid) ? 0 : 1);
                        const remaining = selectedByOthers + emptyOthers + noRecordOthers;
                        if (remaining < minCount) {
                            throw new BadRequestException(`${item.workDate} 当天【${nameOf(stId)}】至少需要 ${minCount} 人值班，其他人员已无法满足，您必须选择【${nameOf(stId)}】`);
                        }
                    }
                    else if (rule.attendance_type !== null && rule.attendance_type !== undefined) {
                        const at = Number(rule.attendance_type);
                        if (chosenAt === at)
                            continue;
                        const selectedByOthers = dayRows.filter((r) => attendanceOf(r.shift_type_id ? Number(r.shift_type_id) : null) === at &&
                            Number(r.user_id) !== uid).length;
                        const emptyOthers = dayRows.filter((r) => !r.shift_type_id && Number(r.user_id) !== uid).length;
                        const scheduledUserIds = new Set(dayRows.map((r) => Number(r.user_id)));
                        const noRecordOthers = totalUsers - scheduledUserIds.size - (scheduledUserIds.has(uid) ? 0 : 1);
                        const remaining = selectedByOthers + emptyOthers + noRecordOthers;
                        if (remaining < minCount) {
                            throw new BadRequestException(`${item.workDate} 当天【${attendanceName(at)}】至少需要 ${minCount} 人值班，其他人员已无法满足，您必须选择【${attendanceName(at)}】`);
                        }
                    }
                }
            }
        }
    }
    async getShiftTypeName(shiftTypeId) {
        const { data, error } = await this.cloudbase
            .from('shift_types')
            .select('name')
            .eq('id', Number(shiftTypeId))
            .limit(1);
        if (error)
            throw error;
        return data?.[0]?.name ?? String(shiftTypeId);
    }
    async submitMySchedules(userId, year, month) {
        const monthKey = this.formatMonthKey(year, month);
        const uid = Number(userId);
        const { count, error: countError } = await this.cloudbase
            .from('schedules')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', uid)
            .eq('month_key', monthKey);
        if (countError)
            throw countError;
        if ((count ?? 0) === 0) {
            throw new BadRequestException('请先填写排班再提交');
        }
        const { error } = await this.cloudbase
            .from('schedules')
            .update({ status: 1 })
            .eq('user_id', uid)
            .eq('month_key', monthKey)
            .eq('status', 0);
        if (error)
            throw error;
        return this.getMySchedules(userId, year, month);
    }
    async getAllSchedules(year, month, query) {
        const monthKey = this.formatMonthKey(year, month);
        let userBuilder = this.cloudbase
            .from('users')
            .select('id,real_name,username,role_id,status,is_admin')
            .eq('status', 1)
            .eq('is_admin', false)
            .order('id', { ascending: true });
        if (query?.roleId) {
            userBuilder = userBuilder.eq('role_id', Number(query.roleId));
        }
        const { data: allUserRows, error: userError } = await userBuilder;
        if (userError)
            throw userError;
        const allUsers = allUserRows.map((u) => ({
            id: Number(u.id),
            realName: u.real_name,
            username: u.username,
            roleId: u.role_id ? Number(u.role_id) : null,
            status: u.status,
            isAdmin: u.is_admin,
        }));
        const userMap = new Map(allUsers.map((u) => [u.id, u]));
        const userIds = allUsers.map((u) => u.id);
        let scheduleRows = [];
        if (userIds.length > 0) {
            let builder = this.cloudbase
                .from('schedules')
                .select('id,user_id,shift_type_id,work_date,month_key,status,source,created_at,updated_at')
                .eq('month_key', monthKey)
                .in('user_id', userIds);
            if (query?.shiftTypeId) {
                builder = builder.eq('shift_type_id', Number(query.shiftTypeId));
            }
            const { data: rows, error } = await builder.order('work_date', {
                ascending: true,
            });
            if (error)
                throw error;
            scheduleRows = rows ?? [];
        }
        const allShiftTypeIds = scheduleRows
            .map((r) => r.shift_type_id)
            .filter(Boolean);
        const shiftTypeMap = await this.loadShiftTypes(allShiftTypeIds);
        const grouped = {};
        for (const r of scheduleRows) {
            const date = new Date(r.work_date).toISOString().split('T')[0];
            if (!grouped[date])
                grouped[date] = [];
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
    async lockMonth(userId, year, month) {
        const monthKey = this.formatMonthKey(year, month);
        const { error } = await this.cloudbase
            .from('schedules')
            .update({ status: 2 })
            .eq('user_id', Number(userId))
            .eq('month_key', monthKey);
        if (error)
            throw error;
        return { message: '排班已锁定' };
    }
    async unlockMonth(userId, year, month) {
        const monthKey = this.formatMonthKey(year, month);
        const { error } = await this.cloudbase
            .from('schedules')
            .update({ status: 0 })
            .eq('user_id', Number(userId))
            .eq('month_key', monthKey);
        if (error)
            throw error;
        return { message: '排班已解锁' };
    }
    async rejectMonth(userId, year, month) {
        const monthKey = this.formatMonthKey(year, month);
        const { error } = await this.cloudbase
            .from('schedules')
            .update({ status: 0 })
            .eq('user_id', Number(userId))
            .eq('month_key', monthKey);
        if (error)
            throw error;
        return { message: '排班已驳回' };
    }
    async clearUserSchedules(userId, year, month) {
        const monthKey = this.formatMonthKey(year, month);
        const uid = Number(userId);
        const { data: userRows, error: userError } = await this.cloudbase
            .from('users')
            .select('id,is_admin')
            .eq('id', uid)
            .limit(1);
        if (userError)
            throw userError;
        const target = userRows?.[0] ?? null;
        if (!target)
            throw new BadRequestException('人员不存在');
        if (target.is_admin)
            throw new BadRequestException('不能清除管理员的排班');
        const { error } = await this.cloudbase
            .from('schedules')
            .delete()
            .eq('user_id', uid)
            .eq('month_key', monthKey);
        if (error)
            throw error;
        return { message: '排班已清除' };
    }
};
SchedulesService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [CloudBaseService,
        ScheduleWindowsService])
], SchedulesService);
export { SchedulesService };
//# sourceMappingURL=schedules.service.js.map
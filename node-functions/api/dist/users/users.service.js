var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, ConflictException, NotFoundException, BadRequestException, } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CloudBaseService } from '../cloudbase/cloudbase.service.js';
let UsersService = class UsersService {
    cloudbase;
    constructor(cloudbase) {
        this.cloudbase = cloudbase;
    }
    mapUser(row) {
        return {
            id: row.id,
            username: row.username,
            passwordHash: row.password_hash,
            realName: row.real_name,
            roleId: row.role_id,
            phone: row.phone,
            remark: row.remark,
            isAdmin: row.is_admin,
            status: row.status,
            firstLogin: row.first_login,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    async roleWithShiftTypes(roleId) {
        const rid = Number(roleId);
        const { data: roleRows, error: roleError } = await this.cloudbase
            .from('roles')
            .select('id,name')
            .eq('id', rid)
            .limit(1);
        if (roleError)
            throw roleError;
        const role = roleRows?.[0];
        if (!role)
            return null;
        const { data: rstRows, error: rstError } = await this.cloudbase
            .from('role_shift_type')
            .select('shift_type_id')
            .eq('role_id', rid);
        if (rstError)
            throw rstError;
        const ids = rstRows
            ?.map((r) => Number(r.shift_type_id))
            .filter(Boolean);
        let shiftTypes = [];
        if (ids.length > 0) {
            const { data: stRows, error: stError } = await this.cloudbase
                .from('shift_types')
                .select('id,name,color')
                .in('id', ids);
            if (stError)
                throw stError;
            shiftTypes = stRows.map((st) => ({ shiftType: st }));
        }
        return {
            id: role.id,
            name: role.name,
            shiftTypes,
        };
    }
    async create(dto) {
        const { count, error: countError } = await this.cloudbase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('username', dto.username);
        if (countError)
            throw countError;
        if ((count ?? 0) > 0) {
            throw new ConflictException('用户名已存在');
        }
        const passwordHash = await bcrypt.hash(dto.initialPassword, 10);
        const insert = {
            username: dto.username,
            password_hash: passwordHash,
            real_name: dto.realName,
            role_id: dto.roleId,
            phone: dto.phone ?? null,
            remark: dto.remark ?? null,
            is_admin: dto.isAdmin ?? false,
            status: dto.status ?? 1,
            first_login: true,
        };
        const { data, error } = await this.cloudbase
            .from('users')
            .insert(insert)
            .select('id,username,password_hash,real_name,role_id,phone,remark,is_admin,status,first_login,created_at,updated_at');
        if (error)
            throw error;
        return this.mapUser(data[0]);
    }
    async findAll(query) {
        const page = query.page || 1;
        const pageSize = query.pageSize || 20;
        const offset = (page - 1) * pageSize;
        let countBuilder = this.cloudbase.from('users').select('*', {
            count: 'exact',
            head: true,
        });
        let builder = this.cloudbase
            .from('users')
            .select('id,username,password_hash,real_name,role_id,phone,remark,is_admin,status,first_login,created_at,updated_at');
        if (query.keyword) {
            const orFilter = `username.ilike.%${query.keyword}%,real_name.ilike.%${query.keyword}%`;
            countBuilder = countBuilder.or(orFilter);
            builder = builder.or(orFilter);
        }
        if (query.roleId) {
            const filterRoleId = Number(query.roleId);
            countBuilder = countBuilder.eq('role_id', filterRoleId);
            builder = builder.eq('role_id', filterRoleId);
        }
        const { count, error: countError } = await countBuilder;
        if (countError)
            throw countError;
        const { data: rows, error } = await builder
            .order('created_at', { ascending: false })
            .range(offset, offset + pageSize - 1);
        if (error)
            throw error;
        const users = rows.map((r) => this.mapUser(r));
        const roleIds = [...new Set(users.map((u) => u.roleId).filter(Boolean))].map(Number);
        let roleMap = new Map();
        if (roleIds.length > 0) {
            const { data: roleRows, error: roleError } = await this.cloudbase
                .from('roles')
                .select('id,name')
                .in('id', roleIds);
            if (roleError)
                throw roleError;
            roleMap = new Map(roleRows?.map((r) => [Number(r.id), r]) ?? []);
        }
        return {
            list: users.map((u) => ({
                ...u,
                role: u.roleId ? roleMap.get(Number(u.roleId)) || null : null,
            })),
            total: count ?? 0,
        };
    }
    async findOne(id) {
        const { data, error } = await this.cloudbase
            .from('users')
            .select('id,username,password_hash,real_name,role_id,phone,remark,is_admin,status,first_login,created_at,updated_at')
            .eq('id', Number(id))
            .limit(1);
        if (error)
            throw error;
        if (!data || data.length === 0) {
            throw new NotFoundException('用户不存在');
        }
        return this.mapUser(data[0]);
    }
    async findByUsername(username) {
        const { data, error } = await this.cloudbase
            .from('users')
            .select('id,username,password_hash,real_name,role_id,phone,remark,is_admin,status,first_login,created_at,updated_at')
            .eq('username', username)
            .eq('status', 1)
            .limit(1);
        if (error)
            throw error;
        if (!data || data.length === 0)
            return null;
        const row = this.mapUser(data[0]);
        const role = await this.roleWithShiftTypes(row.roleId);
        return { ...row, role };
    }
    async findById(id) {
        const { data, error } = await this.cloudbase
            .from('users')
            .select('id,username,password_hash,real_name,role_id,phone,remark,is_admin,status,first_login,created_at,updated_at')
            .eq('id', Number(id))
            .limit(1);
        if (error)
            throw error;
        if (!data || data.length === 0)
            return null;
        const row = this.mapUser(data[0]);
        const role = await this.roleWithShiftTypes(row.roleId);
        return { ...row, role };
    }
    async update(id, dto) {
        await this.findOne(id);
        const update = {};
        if (dto.realName !== undefined)
            update.real_name = dto.realName;
        if (dto.roleId !== undefined)
            update.role_id = dto.roleId;
        if (dto.phone !== undefined)
            update.phone = dto.phone ?? null;
        if (dto.remark !== undefined)
            update.remark = dto.remark ?? null;
        if (dto.isAdmin !== undefined)
            update.is_admin = dto.isAdmin;
        if (dto.status !== undefined)
            update.status = dto.status;
        if (Object.keys(update).length === 0)
            return this.findOne(id);
        update.updated_at = new Date().toISOString();
        const { error } = await this.cloudbase
            .from('users')
            .update(update)
            .eq('id', Number(id));
        if (error)
            throw error;
        return this.findOne(id);
    }
    async remove(id) {
        const numericId = Number(id);
        const { count: scheduleCount, error: scErr } = await this.cloudbase
            .from('schedules')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', numericId);
        if (scErr)
            throw scErr;
        const { count: swapCount, error: swErr } = await this.cloudbase
            .from('shift_swaps')
            .select('*', { count: 'exact', head: true })
            .or(`applicant_id.eq.${numericId},target_user_id.eq.${numericId}`);
        if (swErr)
            throw swErr;
        if ((scheduleCount ?? 0) > 0 || (swapCount ?? 0) > 0) {
            throw new BadRequestException('该用户存在排班或换班记录，无法删除');
        }
        const { error } = await this.cloudbase.from('users').delete().eq('id', numericId);
        if (error)
            throw error;
        return { message: '删除成功' };
    }
    async resetPassword(id, newPassword) {
        await this.findOne(id);
        const plain = newPassword && newPassword.length > 0
            ? newPassword
            : Array.from({ length: 8 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 62))).join('');
        const passwordHash = await bcrypt.hash(plain, 10);
        const { error } = await this.cloudbase
            .from('users')
            .update({ password_hash: passwordHash, first_login: true })
            .eq('id', Number(id));
        if (error)
            throw error;
        return { message: '密码重置成功', password: plain };
    }
    async seedAdmin() {
        const { data: roleRows, error: roleError } = await this.cloudbase
            .from('roles')
            .select('id')
            .eq('name', '管理员')
            .limit(1);
        if (roleError)
            throw roleError;
        let roleId = roleRows?.[0]?.id;
        if (!roleId) {
            const { data: insertedRole, error: insertRoleError } = await this.cloudbase
                .from('roles')
                .insert({ name: '管理员' })
                .select('id');
            if (insertRoleError)
                throw insertRoleError;
            roleId = insertedRole?.[0]?.id;
        }
        const adminRoleId = Number(roleId);
        const { count, error: countError } = await this.cloudbase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('username', 'admin');
        if (countError)
            throw countError;
        if ((count ?? 0) > 0)
            return;
        const passwordHash = await bcrypt.hash('Admin1234', 10);
        const { error } = await this.cloudbase.from('users').insert({
            username: 'admin',
            password_hash: passwordHash,
            real_name: '系统管理员',
            role_id: adminRoleId,
            is_admin: true,
            first_login: true,
        });
        if (error)
            throw error;
    }
};
UsersService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [CloudBaseService])
], UsersService);
export { UsersService };
//# sourceMappingURL=users.service.js.map
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CloudBaseService } from '../cloudbase/cloudbase.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private cloudbase: CloudBaseService) {}

  private mapUser(row: any) {
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

  private async roleWithShiftTypes(roleId: any) {
    const rid = Number(roleId);
    const { data: roleRows, error: roleError } = await this.cloudbase
      .from('roles')
      .select('id,name')
      .eq('id', rid)
      .limit(1);
    if (roleError) throw roleError;
    const role = roleRows?.[0] as any;
    if (!role) return null;

    const { data: rstRows, error: rstError } = await this.cloudbase
      .from('role_shift_type')
      .select('shift_type_id')
      .eq('role_id', rid);
    if (rstError) throw rstError;

    const ids = (rstRows as any[])
      ?.map((r) => Number(r.shift_type_id))
      .filter(Boolean) as any[];

    let shiftTypes: any[] = [];
    if (ids.length > 0) {
      const { data: stRows, error: stError } = await this.cloudbase
        .from('shift_types')
        .select('id,name,color')
        .in('id', ids);
      if (stError) throw stError;
      shiftTypes = (stRows as any[]).map((st) => ({ shiftType: st }));
    }

    return {
      id: role.id,
      name: role.name,
      shiftTypes,
    };
  }

  async create(dto: CreateUserDto) {
    const { count, error: countError } = await this.cloudbase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('username', dto.username);
    if (countError) throw countError;
    if ((count ?? 0) > 0) {
      throw new ConflictException('用户名已存在');
    }

    const passwordHash = await bcrypt.hash(dto.initialPassword, 10);
    const insert: any = {
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
      .select(
        'id,username,password_hash,real_name,role_id,phone,remark,is_admin,status,first_login,created_at,updated_at',
      );
    if (error) throw error;

    return this.mapUser((data as any[])[0]);
  }

  async findAll(query: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    roleId?: bigint;
  }) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let countBuilder: any = this.cloudbase.from('users').select('*', {
      count: 'exact',
      head: true,
    });
    let builder: any = this.cloudbase
      .from('users')
      .select(
        'id,username,password_hash,real_name,role_id,phone,remark,is_admin,status,first_login,created_at,updated_at',
      );

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
    if (countError) throw countError;

    const { data: rows, error } = await builder
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) throw error;

    const users = (rows as any[]).map((r) => this.mapUser(r));

    const roleIds = [...new Set(users.map((u) => u.roleId).filter(Boolean))].map(Number);
    let roleMap = new Map();
    if (roleIds.length > 0) {
      const { data: roleRows, error: roleError } = await this.cloudbase
        .from('roles')
        .select('id,name')
        .in('id', roleIds);
      if (roleError) throw roleError;
      roleMap = new Map((roleRows as any[])?.map((r) => [Number(r.id), r]) ?? []);
    }

    return {
      list: users.map((u) => ({
        ...u,
        role: u.roleId ? roleMap.get(Number(u.roleId)) || null : null,
      })),
      total: count ?? 0,
    };
  }

  async findOne(id: bigint) {
    const { data, error } = await this.cloudbase
      .from('users')
      .select(
        'id,username,password_hash,real_name,role_id,phone,remark,is_admin,status,first_login,created_at,updated_at',
      )
      .eq('id', Number(id))
      .limit(1);
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new NotFoundException('用户不存在');
    }
    return this.mapUser((data as any[])[0]);
  }

  async findByUsername(username: string) {
    const { data, error } = await this.cloudbase
      .from('users')
      .select(
        'id,username,password_hash,real_name,role_id,phone,remark,is_admin,status,first_login,created_at,updated_at',
      )
      .eq('username', username)
      .eq('status', 1)
      .limit(1);
    if (error) throw error;
    if (!data || data.length === 0) return null;

    const row = this.mapUser((data as any[])[0]);
    const role = await this.roleWithShiftTypes(row.roleId);
    return { ...row, role };
  }

  async findById(id: bigint) {
    const { data, error } = await this.cloudbase
      .from('users')
      .select(
        'id,username,password_hash,real_name,role_id,phone,remark,is_admin,status,first_login,created_at,updated_at',
      )
      .eq('id', Number(id))
      .limit(1);
    if (error) throw error;
    if (!data || data.length === 0) return null;

    const row = this.mapUser((data as any[])[0]);
    const role = await this.roleWithShiftTypes(row.roleId);
    return { ...row, role };
  }

  async update(id: bigint, dto: UpdateUserDto) {
    await this.findOne(id);

    const update: any = {};
    if (dto.realName !== undefined) update.real_name = dto.realName;
    if (dto.roleId !== undefined) update.role_id = dto.roleId;
    if (dto.phone !== undefined) update.phone = dto.phone ?? null;
    if (dto.remark !== undefined) update.remark = dto.remark ?? null;
    if (dto.isAdmin !== undefined) update.is_admin = dto.isAdmin;
    if (dto.status !== undefined) update.status = dto.status;

    if (Object.keys(update).length === 0) return this.findOne(id);

    update.updated_at = new Date().toISOString();

    const { error } = await this.cloudbase
      .from('users')
      .update(update)
      .eq('id', Number(id));
    if (error) throw error;

    return this.findOne(id);
  }

  async remove(id: bigint) {
    const numericId = Number(id);

    // 禁止删除系统内置 admin 账号
    const user = await this.findOne(id);
    if (user.username === 'admin') {
      throw new BadRequestException('系统管理员账号不允许删除');
    }

    // 级联删除该用户的排班记录
    const { error: scDelErr } = await this.cloudbase
      .from('schedules')
      .delete()
      .eq('user_id', numericId);
    if (scDelErr) throw scDelErr;

    // 级联删除该用户相关的换班记录
    const { error: swDelErr } = await this.cloudbase
      .from('shift_swaps')
      .delete()
      .or(`applicant_id.eq.${numericId},target_user_id.eq.${numericId}`);
    if (swDelErr) throw swDelErr;

    const { error } = await this.cloudbase.from('users').delete().eq('id', numericId);
    if (error) throw error;
    return { message: '删除成功' };
  }

  async resetPassword(id: bigint, newPassword?: string) {
    await this.findOne(id);

    const plain =
      newPassword && newPassword.length > 0
        ? newPassword
        : Array.from({ length: 8 }, () =>
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.charAt(
              Math.floor(Math.random() * 62),
            ),
          ).join('');

    const passwordHash = await bcrypt.hash(plain, 10);
    const { error } = await this.cloudbase
      .from('users')
      .update({ password_hash: passwordHash, first_login: true })
      .eq('id', Number(id));
    if (error) throw error;

    return { message: '密码重置成功', password: plain };
  }

  async seedAdmin() {
    const { data: roleRows, error: roleError } = await this.cloudbase
      .from('roles')
      .select('id')
      .eq('name', '管理员')
      .limit(1);
    if (roleError) throw roleError;

    let roleId = (roleRows?.[0] as any)?.id;
    if (!roleId) {
      const { data: insertedRole, error: insertRoleError } = await this.cloudbase
        .from('roles')
        .insert({ name: '管理员' })
        .select('id');
      if (insertRoleError) throw insertRoleError;
      roleId = (insertedRole?.[0] as any)?.id;
    }

    const adminRoleId = Number(roleId);

    const { count, error: countError } = await this.cloudbase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('username', 'admin');
    if (countError) throw countError;
    if ((count ?? 0) > 0) return;

    const passwordHash = await bcrypt.hash('Admin1234', 10);
    const { error } = await this.cloudbase.from('users').insert({
      username: 'admin',
      password_hash: passwordHash,
      real_name: '系统管理员',
      role_id: adminRoleId,
      is_admin: true,
      first_login: true,
    });
    if (error) throw error;
  }
}

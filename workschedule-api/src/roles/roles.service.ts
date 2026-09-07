import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CloudBaseService } from '../cloudbase/cloudbase.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';

@Injectable()
export class RolesService {
  constructor(private cloudbase: CloudBaseService) {}

  private mapRole(row: any) {
    return {
      id: row.id,
      name: row.name,
      remark: row.remark,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async buildRoleOutput(role: any) {
    const roleId = Number(role.id);
    const { count, error: countError } = await this.cloudbase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', roleId);
    if (countError) throw countError;

    const { data: rstRows, error: rstError } = await this.cloudbase
      .from('role_shift_type')
      .select('shift_type_id')
      .eq('role_id', roleId);
    if (rstError) throw rstError;

    const ids = (rstRows as any[])
      ?.map((r) => r.shift_type_id)
      .filter(Boolean) as any[];

    let shiftTypes: any[] = [];
    if (ids.length > 0) {
      const { data: stRows, error: stError } = await this.cloudbase
        .from('shift_types')
        .select('id,name,code,color')
        .in('id', ids);
      if (stError) throw stError;
      shiftTypes = (stRows as any[]).map((st) => ({ shiftType: st }));
    }

    return {
      ...this.mapRole(role),
      shiftTypes,
      _count: { users: count ?? 0 },
    };
  }

  async create(dto: CreateRoleDto) {
    const { count, error: countError } = await this.cloudbase
      .from('roles')
      .select('*', { count: 'exact', head: true })
      .eq('name', dto.name);
    if (countError) throw countError;
    if ((count ?? 0) > 0) {
      throw new ConflictException('角色名称已存在');
    }

    const { data, error } = await this.cloudbase
      .from('roles')
      .insert({ name: dto.name, remark: dto.remark ?? null })
      .select('id,name,remark,created_at,updated_at');
    if (error) throw error;

    const role = (data as any[])[0];

    if (dto.shiftTypeIds && dto.shiftTypeIds.length > 0) {
      const { error: insertError } = await this.cloudbase
        .from('role_shift_type')
        .insert(
          dto.shiftTypeIds.map((id) => ({
            role_id: role.id,
            shift_type_id: Number(id),
          })),
        );
      if (insertError) throw insertError;
    }

    return this.buildRoleOutput(role);
  }

  async findAll() {
    const { data: rows, error } = await this.cloudbase
      .from('roles')
      .select('id,name,remark,created_at,updated_at')
      .order('created_at', { ascending: false });
    if (error) throw error;

    return Promise.all(
      (rows as any[]).map((role) => this.buildRoleOutput(role)),
    );
  }

  async findOne(id: bigint) {
    const roleId = Number(id);
    const { data: rows, error } = await this.cloudbase
      .from('roles')
      .select('id,name,remark,created_at,updated_at')
      .eq('id', roleId)
      .limit(1);
    if (error) throw error;
    if (!rows || rows.length === 0) {
      throw new NotFoundException('角色不存在');
    }

    return this.buildRoleOutput((rows as any[])[0]);
  }

  async update(id: bigint, dto: UpdateRoleDto) {
    const roleId = Number(id);
    await this.findOne(id);

    const update: any = {};
    if (dto.name !== undefined) update.name = dto.name;
    if (dto.remark !== undefined) update.remark = dto.remark ?? null;

    if (Object.keys(update).length > 0) {
      update.updated_at = new Date().toISOString();
      const { error } = await this.cloudbase
        .from('roles')
        .update(update)
        .eq('id', roleId);
      if (error) throw error;
    }

    if (dto.shiftTypeIds !== undefined) {
      const { error: deleteError } = await this.cloudbase
        .from('role_shift_type')
        .delete()
        .eq('role_id', roleId);
      if (deleteError) throw deleteError;

      if (dto.shiftTypeIds.length > 0) {
        const { error: insertError } = await this.cloudbase
          .from('role_shift_type')
          .insert(
            dto.shiftTypeIds.map((sid) => ({
              role_id: roleId,
              shift_type_id: Number(sid),
            })),
          );
        if (insertError) throw insertError;
      }
    }

    return this.findOne(id);
  }

  async remove(id: bigint) {
    const roleId = Number(id);
    const role = await this.findOne(id);
    if (role._count.users > 0) {
      throw new BadRequestException('该角色下存在人员，无法删除');
    }

    const { error: deleteRstError } = await this.cloudbase
      .from('role_shift_type')
      .delete()
      .eq('role_id', roleId);
    if (deleteRstError) throw deleteRstError;

    const { error } = await this.cloudbase.from('roles').delete().eq('id', roleId);
    if (error) throw error;

    return { message: '删除成功' };
  }
}

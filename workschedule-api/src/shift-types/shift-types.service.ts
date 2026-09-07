import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CloudBaseService } from '../cloudbase/cloudbase.service.js';
import { CreateShiftTypeDto } from './dto/create-shift-type.dto.js';
import { UpdateShiftTypeDto } from './dto/update-shift-type.dto.js';

@Injectable()
export class ShiftTypesService {
  constructor(private cloudbase: CloudBaseService) {}

  private mapType(row: any) {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      color: row.color,
      timeRange: row.time_range,
      remark: row.remark,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async create(dto: CreateShiftTypeDto) {
    const { count, error: countError } = await this.cloudbase
      .from('shift_types')
      .select('*', { count: 'exact', head: true })
      .eq('code', dto.code);
    if (countError) throw countError;
    if ((count ?? 0) > 0) {
      throw new ConflictException('类型编码已存在');
    }

    const insert: any = {
      name: dto.name,
      code: dto.code,
      color: dto.color ?? '#3B82F6',
      time_range: dto.timeRange ?? null,
      remark: dto.remark ?? null,
      status: dto.status ?? 1,
    };

    const { data, error } = await this.cloudbase
      .from('shift_types')
      .insert(insert)
      .select(
        'id,name,code,color,time_range,remark,status,created_at,updated_at',
      );
    if (error) throw error;

    return this.mapType((data as any[])[0]);
  }

  async findAll() {
    const { data, error } = await this.cloudbase
      .from('shift_types')
      .select(
        'id,name,code,color,time_range,remark,status,created_at,updated_at',
      )
      .order('created_at', { ascending: false });
    if (error) throw error;

    return (data as any[]).map((r) => this.mapType(r));
  }

  async findOne(id: bigint) {
    const { data, error } = await this.cloudbase
      .from('shift_types')
      .select(
        'id,name,code,color,time_range,remark,status,created_at,updated_at',
      )
      .eq('id', id)
      .limit(1);
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new NotFoundException('值班类型不存在');
    }
    return this.mapType((data as any[])[0]);
  }

  async update(id: bigint, dto: UpdateShiftTypeDto) {
    await this.findOne(id);

    const update: any = {};
    if (dto.name !== undefined) update.name = dto.name;
    if (dto.color !== undefined) update.color = dto.color;
    if (dto.timeRange !== undefined) update.time_range = dto.timeRange ?? null;
    if (dto.remark !== undefined) update.remark = dto.remark ?? null;

    if (Object.keys(update).length === 0) return this.findOne(id);

    update.updated_at = new Date().toISOString();

    const { error } = await this.cloudbase
      .from('shift_types')
      .update(update)
      .eq('id', id);
    if (error) throw error;

    return this.findOne(id);
  }

  async remove(id: bigint) {
    await this.findOne(id);

    const { count, error: countError } = await this.cloudbase
      .from('schedules')
      .select('*', { count: 'exact', head: true })
      .eq('shift_type_id', id);
    if (countError) throw countError;
    if ((count ?? 0) > 0) {
      throw new BadRequestException('该类型已被使用，无法删除，建议禁用');
    }

    const { error } = await this.cloudbase
      .from('shift_types')
      .delete()
      .eq('id', id);
    if (error) throw error;

    return { message: '删除成功' };
  }

  async toggleStatus(id: bigint) {
    const type = await this.findOne(id);
    const newStatus = type.status === 1 ? 0 : 1;

    const { error } = await this.cloudbase
      .from('shift_types')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;

    return this.findOne(id);
  }
}

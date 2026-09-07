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
import { CloudBaseService } from '../cloudbase/cloudbase.service.js';
let ShiftTypesService = class ShiftTypesService {
    cloudbase;
    constructor(cloudbase) {
        this.cloudbase = cloudbase;
    }
    mapType(row) {
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
    async create(dto) {
        const { count, error: countError } = await this.cloudbase
            .from('shift_types')
            .select('*', { count: 'exact', head: true })
            .eq('code', dto.code);
        if (countError)
            throw countError;
        if ((count ?? 0) > 0) {
            throw new ConflictException('类型编码已存在');
        }
        const insert = {
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
            .select('id,name,code,color,time_range,remark,status,created_at,updated_at');
        if (error)
            throw error;
        return this.mapType(data[0]);
    }
    async findAll() {
        const { data, error } = await this.cloudbase
            .from('shift_types')
            .select('id,name,code,color,time_range,remark,status,created_at,updated_at')
            .order('created_at', { ascending: false });
        if (error)
            throw error;
        return data.map((r) => this.mapType(r));
    }
    async findOne(id) {
        const { data, error } = await this.cloudbase
            .from('shift_types')
            .select('id,name,code,color,time_range,remark,status,created_at,updated_at')
            .eq('id', id)
            .limit(1);
        if (error)
            throw error;
        if (!data || data.length === 0) {
            throw new NotFoundException('值班类型不存在');
        }
        return this.mapType(data[0]);
    }
    async update(id, dto) {
        await this.findOne(id);
        const update = {};
        if (dto.name !== undefined)
            update.name = dto.name;
        if (dto.color !== undefined)
            update.color = dto.color;
        if (dto.timeRange !== undefined)
            update.time_range = dto.timeRange ?? null;
        if (dto.remark !== undefined)
            update.remark = dto.remark ?? null;
        if (Object.keys(update).length === 0)
            return this.findOne(id);
        update.updated_at = new Date().toISOString();
        const { error } = await this.cloudbase
            .from('shift_types')
            .update(update)
            .eq('id', id);
        if (error)
            throw error;
        return this.findOne(id);
    }
    async remove(id) {
        await this.findOne(id);
        const { count, error: countError } = await this.cloudbase
            .from('schedules')
            .select('*', { count: 'exact', head: true })
            .eq('shift_type_id', id);
        if (countError)
            throw countError;
        if ((count ?? 0) > 0) {
            throw new BadRequestException('该类型已被使用，无法删除，建议禁用');
        }
        const { error } = await this.cloudbase
            .from('shift_types')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
        return { message: '删除成功' };
    }
    async toggleStatus(id) {
        const type = await this.findOne(id);
        const newStatus = type.status === 1 ? 0 : 1;
        const { error } = await this.cloudbase
            .from('shift_types')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error)
            throw error;
        return this.findOne(id);
    }
};
ShiftTypesService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [CloudBaseService])
], ShiftTypesService);
export { ShiftTypesService };
//# sourceMappingURL=shift-types.service.js.map
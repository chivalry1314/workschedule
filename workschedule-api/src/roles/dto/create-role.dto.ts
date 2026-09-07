import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty({ message: '角色名称不能为空' })
  name: string;

  @IsString()
  @IsOptional()
  remark?: string;

  @IsArray()
  @IsOptional()
  shiftTypeIds?: number[];
}

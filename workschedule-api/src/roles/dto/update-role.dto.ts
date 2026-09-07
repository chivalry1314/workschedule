import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  remark?: string;

  @IsArray()
  @IsOptional()
  shiftTypeIds?: number[];
}

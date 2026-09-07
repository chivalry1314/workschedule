import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
} from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  realName?: string;

  @IsInt()
  @IsOptional()
  roleId?: number;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  remark?: string;

  @IsBoolean()
  @IsOptional()
  isAdmin?: boolean;

  @IsInt()
  @IsOptional()
  status?: number;
}

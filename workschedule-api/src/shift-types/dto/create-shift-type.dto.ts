import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CreateShiftTypeDto {
  @IsString()
  @IsNotEmpty({ message: '类型名称不能为空' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: '类型编码不能为空' })
  code: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  timeRange?: string;

  @IsString()
  @IsOptional()
  remark?: string;

  @IsInt()
  @IsOptional()
  status?: number;
}

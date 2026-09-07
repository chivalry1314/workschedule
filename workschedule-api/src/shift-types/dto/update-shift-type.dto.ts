import { IsString, IsOptional, Allow } from 'class-validator';

export class UpdateShiftTypeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @Allow()
  code?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsString()
  @IsOptional()
  timeRange?: string;

  @IsString()
  @IsOptional()
  remark?: string;
}

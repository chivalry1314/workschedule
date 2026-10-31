import {
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  ValidateNested,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

class ScheduleTemplateUserItemDto {
  @IsInt()
  userId: number;

  @IsInt()
  @IsOptional()
  monday?: number | null;

  @IsInt()
  @IsOptional()
  tuesday?: number | null;

  @IsInt()
  @IsOptional()
  wednesday?: number | null;

  @IsInt()
  @IsOptional()
  thursday?: number | null;

  @IsInt()
  @IsOptional()
  friday?: number | null;

  @IsInt()
  @IsOptional()
  saturday?: number | null;

  @IsInt()
  @IsOptional()
  sunday?: number | null;
}

export class UpdateScheduleTemplateDto {
  @IsString()
  @IsOptional()
  @MinLength(1, { message: '模板名称不能为空' })
  name?: string;

  @IsInt()
  @IsOptional()
  status?: number;

  @IsInt()
  @IsOptional()
  templateType?: number;

  @IsInt()
  @IsOptional()
  replaceShiftTypeId?: number | null;

  @IsInt()
  @IsOptional()
  replacedShiftTypeId?: number | null;

  @IsArray()
  @IsOptional()
  @IsInt({ each: true })
  targetUserIds?: number[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ScheduleTemplateUserItemDto)
  items?: ScheduleTemplateUserItemDto[];
}

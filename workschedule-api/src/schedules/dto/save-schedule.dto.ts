import { IsInt, IsNotEmpty, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ScheduleItemDto {
  @IsNotEmpty({ message: '日期不能为空' })
  workDate: string;

  @IsOptional()
  shiftTypeId?: number | null;
}

export class SaveScheduleDto {
  @IsInt({ message: '年份必须是整数' })
  year: number;

  @IsInt({ message: '月份必须是整数' })
  month: number;

  @IsArray({ message: '排班数据必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  items: ScheduleItemDto[];
}

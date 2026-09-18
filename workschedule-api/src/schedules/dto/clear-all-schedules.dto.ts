import { IsInt } from 'class-validator';

export class ClearAllSchedulesDto {
  @IsInt({ message: '年份必须是整数' })
  year: number;

  @IsInt({ message: '月份必须是整数' })
  month: number;
}

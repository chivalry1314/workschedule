import { IsInt, IsNotEmpty } from 'class-validator';

export class InitializeScheduleDto {
  @IsInt({ message: '年份必须是整数' })
  year: number;

  @IsInt({ message: '月份必须是整数' })
  month: number;

  @IsNotEmpty({ message: '值班类型不能为空' })
  shiftTypeId: number;
}

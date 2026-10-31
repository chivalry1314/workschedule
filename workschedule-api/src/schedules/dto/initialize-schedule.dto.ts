import { IsInt, IsOptional, ValidateIf } from 'class-validator';

export class InitializeScheduleDto {
  @IsInt({ message: '年份必须是整数' })
  year: number;

  @IsInt({ message: '月份必须是整数' })
  month: number;

  @IsOptional()
  @IsInt({ message: '值班类型必须是整数' })
  @ValidateIf((o) => !o.templateId)
  shiftTypeId?: number;

  @IsOptional()
  @IsInt({ message: '模板 ID 必须是整数' })
  @ValidateIf((o) => !o.shiftTypeId)
  templateId?: number;
}

import { IsInt, Min } from 'class-validator';

export class ApplyScheduleTemplateDto {
  @IsInt()
  @Min(2000)
  year: number;

  @IsInt()
  @Min(1)
  month: number;
}

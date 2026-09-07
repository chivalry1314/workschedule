import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateSwapDto {
  @IsInt({ message: '申请人排班ID必须是整数' })
  applicantScheduleId: number;

  @IsOptional()
  @IsInt({ message: '目标用户ID必须是整数' })
  targetUserId?: number;

  @IsOptional()
  @IsInt({ message: '目标排班ID必须是整数' })
  targetScheduleId?: number;

  @IsInt({ message: '换班类型必须是整数' })
  swapType: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

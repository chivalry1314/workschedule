import { IsString, IsNotEmpty, MinLength, Matches, Allow } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: '原密码不能为空' })
  oldPassword: string;

  @IsString()
  @MinLength(8, { message: '新密码至少8位' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: '新密码需同时包含字母和数字',
  })
  newPassword: string;

  @Allow()
  confirmPassword?: string;
}

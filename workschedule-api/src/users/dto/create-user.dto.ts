import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  MinLength,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  username: string;

  @IsString()
  @MinLength(8, { message: '初始密码至少8位' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: '初始密码需同时包含字母和数字',
  })
  initialPassword: string;

  @IsString()
  @IsNotEmpty({ message: '姓名不能为空' })
  realName: string;

  @IsInt({ message: '角色ID必须是整数' })
  roleId: number;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  remark?: string;

  @IsBoolean()
  @IsOptional()
  isAdmin?: boolean;

  @IsInt()
  @IsOptional()
  status?: number;
}

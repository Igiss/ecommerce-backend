import { IsEmail, IsEnum, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { IsVietnamPhone } from '../../common/decorators/is-vietnam-phone.decorator';
import { Role } from '../../common/enums/role.enum';
import { UserStatus } from '../../database/schemas/user.schema';

export class CreateUserDto {
  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsVietnamPhone()
  phone?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsIn(['pending', 'active', 'blocked'])
  status?: UserStatus;
}

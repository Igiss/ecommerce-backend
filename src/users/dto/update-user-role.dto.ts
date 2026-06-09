import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: Role, example: Role.Owner })
  @IsEnum(Role)
  role: Role;
}

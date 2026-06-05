import { IsIn } from 'class-validator';
import { UserStatus } from '../../database/schemas/user.schema';

export class UpdateUserStatusDto {
  @IsIn(['active', 'blocked'])
  status: UserStatus;
}

import { Role } from '../../common/enums/role.enum';
import { UserStatus } from '../../database/schemas/user.schema';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  status: UserStatus;
}

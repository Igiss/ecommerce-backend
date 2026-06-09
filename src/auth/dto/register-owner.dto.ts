import { ApiProperty } from '@nestjs/swagger';
import { RegisterDto } from './register.dto';

export class RegisterOwnerDto extends RegisterDto {
  @ApiProperty({ example: 'owner@example.com' })
  declare email: string;
}

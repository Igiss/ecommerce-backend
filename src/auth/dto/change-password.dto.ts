import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: '12345678' })
  @IsString()
  @MinLength(6)
  oldPassword: string;

  @ApiProperty({ example: 'new-password-123' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

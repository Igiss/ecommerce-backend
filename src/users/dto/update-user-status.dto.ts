import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '../../database/schemas/user.schema';

export class UpdateUserStatusDto {
  @ApiProperty({
    enum: ['pending', 'active', 'blocked'],
    example: 'active',
    description: 'Dùng active để duyệt tài khoản owner đang pending',
  })
  @IsIn(['pending', 'active', 'blocked'])
  status: UserStatus;

  @ApiPropertyOptional({ example: 'Vi phạm điều khoản sử dụng' })
  @IsOptional()
  @IsString()
  blockedReason?: string;
}

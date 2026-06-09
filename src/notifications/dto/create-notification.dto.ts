import { IsEnum, IsMongoId, IsObject, IsOptional, IsString } from 'class-validator';
import { NotificationType } from '../../database/schemas/notification.schema';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ description: 'MongoDB ObjectId của người nhận' })
  @IsMongoId()
  userId: string;

  @ApiProperty({ example: 'Đơn hàng đã được xác nhận' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Đơn hàng của bạn đang được chuẩn bị.' })
  @IsString()
  message: string;

  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    example: { orderId: '665f1d7f1f8b9a0012a34567' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

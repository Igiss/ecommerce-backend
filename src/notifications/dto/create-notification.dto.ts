import { IsEnum, IsMongoId, IsObject, IsOptional, IsString } from 'class-validator';
import { NotificationType } from '../../database/schemas/notification.schema';

export class CreateNotificationDto {
  @IsMongoId()
  userId: string;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

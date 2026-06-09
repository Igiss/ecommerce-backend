import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../../common/enums/order-status.enum';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus })
  @IsEnum(OrderStatus)
  orderStatus: OrderStatus;

  @ApiPropertyOptional({ example: 'Khách hàng yêu cầu hủy' })
  @IsOptional()
  @IsString()
  cancelReason?: string;
}

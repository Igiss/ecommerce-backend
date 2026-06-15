import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '../../common/enums/order-status.enum';

const ADMIN_ORDER_STATUSES = [
  OrderStatus.Confirmed,
  OrderStatus.Shipping,
  OrderStatus.Completed,
] as const;

export class UpdateAdminOrderStatusDto {
  @ApiProperty({
    enum: ADMIN_ORDER_STATUSES,
    description: 'Admin cannot cancel an order on behalf of the user.',
  })
  @IsIn(ADMIN_ORDER_STATUSES)
  orderStatus: OrderStatus.Confirmed | OrderStatus.Shipping | OrderStatus.Completed;

  @ApiPropertyOptional({ example: 'GHN' })
  @IsOptional()
  @IsString()
  shippingProvider?: string;

  @ApiPropertyOptional({ example: 'GHN123456789' })
  @IsOptional()
  @IsString()
  trackingCode?: string;
}

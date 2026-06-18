import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { OrderStatus } from '../../common/enums/order-status.enum';

const ADMIN_ORDER_STATUSES = [OrderStatus.Confirmed] as const;

export class UpdateAdminOrderStatusDto {
  @ApiProperty({
    enum: ADMIN_ORDER_STATUSES,
    description:
      'Admin chỉ confirm đơn. Hệ thống tự động gán ShippingUnit dựa theo phường/xã giao hàng. ' +
      'Admin có thể override ShippingUnit qua endpoint /orders/:id/assign-unit.',
  })
  @IsIn(ADMIN_ORDER_STATUSES)
  orderStatus: OrderStatus.Confirmed;
}

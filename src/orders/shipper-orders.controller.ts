import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { PickupOrderDto } from './dto/pickup-order.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Shipper)
@Controller('shipper/orders')
export class ShipperOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({
    summary: '[Shipper] Danh sách đơn hàng được assign cho mình',
    description: 'Chỉ trả về đơn có shipperId = userId hiện tại, ở trạng thái assigned hoặc shipping.',
  })
  getMyOrders(@CurrentUser() user: JwtPayload) {
    return this.ordersService.findAllForShipper(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: '[Shipper] Chi tiết đơn hàng của mình' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của đơn hàng' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy hoặc đơn không phải của mình' })
  getOrder(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.ordersService.findOne(id, user.sub, user.role);
  }

  @Patch(':id/pickup')
  @ApiOperation({
    summary: '[Shipper] Nhận đơn hàng để giao (assigned → shipping)',
    description: 'Shipper chỉ nhận được đơn đã được assign cho mình.',
  })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của đơn hàng' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy, không phải đơn của mình, hoặc không đúng trạng thái' })
  pickupOrder(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: PickupOrderDto,
  ) {
    return this.ordersService.pickupOrder(id, user.sub, dto);
  }

  @Patch(':id/complete')
  @ApiOperation({
    summary: '[Shipper] Xác nhận giao hàng thành công (shipping → completed)',
    description: 'Shipper chỉ hoàn thành được đơn của mình đang ở trạng thái shipping.',
  })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của đơn hàng' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy, không phải đơn của mình, hoặc không đúng trạng thái' })
  completeDelivery(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.ordersService.completeDelivery(id, user.sub);
  }
}

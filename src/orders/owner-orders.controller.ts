import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
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
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiCookieAuth()
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Owner)
@Controller('owner/orders')
export class OwnerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({
    summary: '[Owner] Lấy các đơn hàng có sản phẩm thuộc shop hiện tại',
    description:
      'Chỉ trả về order item có ownerId khớp với user ID trong JWT; không trả item của shop khác.',
  })
  getOrders(@CurrentUser() user: JwtPayload) {
    return this.ordersService.findAllByOwner(user.sub);
  }

  @Get(':id')
  @ApiOperation({
    summary: '[Owner] Xem phần đơn hàng thuộc shop hiện tại',
    description:
      'Không sử dụng ownerId từ request. Phạm vi dữ liệu luôn được xác định từ JWT.',
  })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của đơn hàng' })
  @ApiNotFoundResponse({
    description: 'Không tìm thấy đơn hàng hoặc đơn không có sản phẩm của owner hiện tại',
  })
  getOrder(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.ordersService.findOneByOwner(id, user.sub);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: '[Owner] Cập nhật fulfillment của các item thuộc shop hiện tại',
    description:
      'Chỉ cập nhật order item có ownerId khớp JWT; trạng thái item của shop khác được giữ nguyên.',
  })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của đơn hàng' })
  updateOrderStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOwnerFulfillment(id, user.sub, dto);
  }

  @Patch(':id/hand-over')
  @ApiOperation({
    summary: '[Owner] Xác nhận đã giao hàng cho đơn vị vận chuyển',
    description:
      'Owner xác nhận tất cả sản phẩm của mình trong đơn đã được đưa cho bên vận chuyển. ' +
      'Đơn phải ở trạng thái assigned hoặc shipping.',
  })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của đơn hàng' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng hoặc đơn chưa được phân cho vận chuyển' })
  handOverToShipping(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.ordersService.ownerHandOverToShipping(id, user.sub);
  }

  @Patch(':id/items/:itemId/return-status')
  @ApiOperation({ summary: '[Owner] Cập nhật trạng thái đổi trả của một sản phẩm' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của đơn hàng' })
  @ApiParam({ name: 'itemId', description: 'MongoDB ObjectId của sản phẩm (hoặc custom design)' })
  updateReturnStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseMongoIdPipe) id: string,
    @Param('itemId', ParseMongoIdPipe) itemId: string,
    @Body() dto: import('./dto/update-return-status.dto').UpdateReturnStatusDto,
  ) {
    return this.ordersService.updateReturnStatus(id, user.sub, itemId, dto);
  }
}

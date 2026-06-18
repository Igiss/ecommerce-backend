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
import { AssignShipperDto } from './dto/assign-shipper.dto';
import { ShippingUnitsService } from './shipping-units.service';

@ApiTags('ShippingUnits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ShippingUnit)
@Controller('shipping-unit/orders')
export class ShipperAssignmentController {
  constructor(private readonly shippingUnitsService: ShippingUnitsService) {}

  @Get()
  @ApiOperation({
    summary: '[ShippingUnit] Danh sách đơn hàng được phân cho đơn vị',
    description: 'Bao gồm đơn ở trạng thái: assigned, shipping, completed.',
  })
  getOrders(@CurrentUser() user: JwtPayload) {
    return this.shippingUnitsService.findOrdersByUnit(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: '[ShippingUnit] Chi tiết đơn hàng thuộc đơn vị' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của đơn hàng' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy hoặc không thuộc đơn vị' })
  getOrder(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.shippingUnitsService.findOrderByIdForUnit(id, user.sub);
  }

  @Patch(':id/assign-shipper')
  @ApiOperation({
    summary: '[ShippingUnit] Phân đơn hàng cho một Shipper thuộc đơn vị',
    description: 'Chỉ phân được Shipper thuộc đơn vị mình. Đơn phải đang ở trạng thái assigned.',
  })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của đơn hàng' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hoặc Shipper không thuộc đơn vị' })
  assignShipper(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: AssignShipperDto,
  ) {
    return this.shippingUnitsService.assignShipper(id, user.sub, dto.shipperId);
  }
}

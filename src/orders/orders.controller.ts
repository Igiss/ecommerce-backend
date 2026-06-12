import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
import { CancelOrderDto } from './dto/cancel-order.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: '[User] Tạo đơn hàng từ sản phẩm thường hoặc sản phẩm custom' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.sub, dto);
  }

  @Get('me')
  @ApiOperation({ summary: '[User] Lấy danh sách đơn hàng của tài khoản đang đăng nhập' })
  findMine(@CurrentUser() user: JwtPayload) {
    return this.ordersService.findMine(user.sub);
  }

  @Get()
  @ApiOperation({ summary: '[Admin/Owner] Lấy danh sách tất cả đơn hàng' })
  @Roles(Role.Admin)
  findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '[User/Admin/Owner] Xem chi tiết đơn hàng' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của đơn hàng' })
  @ApiBadRequestResponse({ description: 'ID đơn hàng không hợp lệ' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn hàng' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id', ParseMongoIdPipe) id: string) {
    return this.ordersService.findOne(id, user.sub, user.role);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '[Admin/Owner] Cập nhật trạng thái đơn hàng' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của đơn hàng' })
  @Roles(Role.Admin)
  updateStatus(@Param('id', ParseMongoIdPipe) id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: '[User] Hủy đơn hàng của mình khi đơn còn pending' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của đơn hàng' })
  cancelMine(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelMine(id, user.sub, dto.cancelReason);
  }
}

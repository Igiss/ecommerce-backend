import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
import { CreateShipperDto } from './dto/create-shipper.dto';
import { UpdateShipperDto } from './dto/update-shipper.dto';
import { ShippingUnitsService } from './shipping-units.service';

@ApiTags('ShippingUnits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ShippingUnit)
@Controller('shipping-unit/shippers')
export class ShipperManagementController {
  constructor(private readonly shippingUnitsService: ShippingUnitsService) {}

  @Post()
  @ApiOperation({
    summary: '[ShippingUnit] Tạo tài khoản Shipper mới thuộc đơn vị',
    description: 'Shipper được tạo với status active ngay — không cần admin duyệt.',
  })
  createShipper(@CurrentUser() user: JwtPayload, @Body() dto: CreateShipperDto) {
    return this.shippingUnitsService.createShipper(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: '[ShippingUnit] Danh sách Shipper thuộc đơn vị' })
  findShippers(@CurrentUser() user: JwtPayload) {
    return this.shippingUnitsService.findShippersByUnit(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: '[ShippingUnit] Chi tiết một Shipper thuộc đơn vị' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của user Shipper' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy hoặc không thuộc đơn vị' })
  findShipper(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.shippingUnitsService.findShipperById(id, user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[ShippingUnit] Cập nhật thông tin Shipper (address, phone, khu vực phụ trách...)' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của user Shipper' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy hoặc không thuộc đơn vị' })
  updateShipper(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: UpdateShipperDto,
  ) {
    return this.shippingUnitsService.updateShipperProfile(id, user.sub, dto);
  }

  @Patch(':id/availability')
  @ApiOperation({ summary: '[ShippingUnit] Bật/tắt trạng thái sẵn sàng của Shipper' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của user Shipper' })
  updateAvailability(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body('isAvailable') isAvailable: boolean,
  ) {
    return this.shippingUnitsService.updateShipperAvailability(id, user.sub, isAvailable);
  }
}

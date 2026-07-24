import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
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
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get('active')
  @ApiOperation({ summary: '[Public] Lấy danh sách mã giảm giá đang kích hoạt' })
  @ApiOkResponse({ description: 'Danh sách coupon đang kích hoạt và chưa hết hạn' })
  findActive() {
    return this.couponsService.findActiveCoupons();
  }

  @Post('validate')
  @ApiOperation({ summary: '[User] Kiểm tra mã giảm giá và tính số tiền được giảm' })
  @ApiOkResponse({
    description: 'Coupon hợp lệ',
    schema: {
      example: {
        coupon: {
          code: 'SALE10',
          discountType: 'percentage',
          discountAmount: 10,
          minOrderValue: 200000,
          maxDiscount: 50000,
          expiryDate: '2026-12-31T23:59:59.000Z',
          isActive: true,
          usageLimit: 100,
          usedCount: 0,
        },
        actualDiscount: 50000,
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Coupon hết hạn, bị khóa, hết lượt hoặc đơn hàng chưa đạt giá trị tối thiểu',
  })
  @ApiNotFoundResponse({ description: 'Không tìm thấy coupon' })
  validate(@Body() dto: ValidateCouponDto) {
    return this.couponsService.validate(dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: '[Admin/Owner] Lấy danh sách coupon' })
  @ApiOkResponse({ description: 'Danh sách coupon, mới nhất trước' })
  @Roles(Role.Admin)
  findAll(@Query('scope') scope?: 'system' | 'owner' | 'all') {
    return this.couponsService.findAll(scope || 'system');
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: '[Admin/Owner] Tạo coupon mới' })
  @ApiCreatedResponse({ description: 'Coupon đã được tạo' })
  @ApiBadRequestResponse({ description: 'Mã đã tồn tại hoặc giá trị giảm không hợp lệ' })
  @Roles(Role.Admin)
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto, undefined);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: '[Admin/Owner] Cập nhật coupon' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của coupon' })
  @ApiOkResponse({ description: 'Coupon sau khi cập nhật' })
  @ApiBadRequestResponse({ description: 'ID hoặc dữ liệu cập nhật không hợp lệ' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy coupon' })
  @Roles(Role.Admin)
  update(@Param('id', ParseMongoIdPipe) id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: '[Admin/Owner] Xóa coupon' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của coupon' })
  @ApiOkResponse({ description: 'Coupon đã được xóa' })
  @ApiBadRequestResponse({ description: 'ID coupon không hợp lệ' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy coupon' })
  @Roles(Role.Admin)
  remove(@Param('id', ParseMongoIdPipe) id: string) {
    return this.couponsService.remove(id);
  }
}

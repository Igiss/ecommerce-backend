import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@ApiTags('Coupons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

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
  @ApiOperation({ summary: '[Admin/Owner] Lấy danh sách coupon' })
  @ApiOkResponse({ description: 'Danh sách coupon, mới nhất trước' })
  @Roles(Role.Admin, Role.Owner)
  findAll() {
    return this.couponsService.findAll();
  }

  @Post()
  @ApiOperation({ summary: '[Admin/Owner] Tạo coupon mới' })
  @ApiCreatedResponse({ description: 'Coupon đã được tạo' })
  @ApiBadRequestResponse({ description: 'Mã đã tồn tại hoặc giá trị giảm không hợp lệ' })
  @Roles(Role.Admin, Role.Owner)
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '[Admin/Owner] Cập nhật coupon' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của coupon' })
  @ApiOkResponse({ description: 'Coupon sau khi cập nhật' })
  @ApiBadRequestResponse({ description: 'ID hoặc dữ liệu cập nhật không hợp lệ' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy coupon' })
  @Roles(Role.Admin, Role.Owner)
  update(@Param('id', ParseMongoIdPipe) id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '[Admin/Owner] Xóa coupon' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của coupon' })
  @ApiOkResponse({ description: 'Coupon đã được xóa' })
  @ApiBadRequestResponse({ description: 'ID coupon không hợp lệ' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy coupon' })
  @Roles(Role.Admin, Role.Owner)
  remove(@Param('id', ParseMongoIdPipe) id: string) {
    return this.couponsService.remove(id);
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
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
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { CouponsService } from './coupons.service';

@ApiTags('Coupons')
@ApiCookieAuth()
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Owner)
@Controller('owner/coupons')
export class OwnerCouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  @ApiOperation({
    summary: '[Owner] Lấy coupon của shop hiện tại',
    description: 'Chỉ truy vấn coupon có ownerId khớp user ID trong JWT.',
  })
  getCoupons(@CurrentUser() user: JwtPayload) {
    return this.couponsService.findAllByOwner(user.sub);
  }

  @Post()
  @ApiOperation({
    summary: '[Owner] Tạo coupon cho shop hiện tại',
    description: 'Backend tự gán ownerId từ JWT.',
  })
  createCoupon(@CurrentUser() user: JwtPayload, @Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto, user.sub);
  }

  @Patch(':id')
  @ApiOperation({
    summary: '[Owner] Cập nhật coupon của shop hiện tại',
    description: 'Trả về 404 nếu coupon thuộc owner khác.',
  })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của coupon' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy coupon thuộc owner hiện tại' })
  updateCoupon(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.couponsService.updateByOwner(id, user.sub, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '[Owner] Xóa coupon của shop hiện tại',
    description: 'Không thể xóa coupon thuộc owner khác.',
  })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của coupon' })
  deleteCoupon(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseMongoIdPipe) id: string,
  ) {
    return this.couponsService.removeByOwner(id, user.sub);
  }
}

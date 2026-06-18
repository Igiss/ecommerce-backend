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
import { UpdateShippingUnitDto } from './dto/update-shipping-unit.dto';
import { UpdateCoverageDto } from './dto/update-coverage.dto';
import { ShippingUnitsService } from './shipping-units.service';

@ApiTags('ShippingUnits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shipping-units')
export class ShippingUnitsController {
  constructor(private readonly shippingUnitsService: ShippingUnitsService) {}

  // ─── Admin ───────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: '[Admin] Danh sách tất cả đơn vị vận chuyển' })
  @Roles(Role.Admin)
  findAll() {
    return this.shippingUnitsService.findAll();
  }

  @Patch(':userId/coverage')
  @ApiOperation({ summary: '[Admin] Cập nhật danh sách phường/xã phủ sóng của đơn vị' })
  @ApiParam({ name: 'userId', description: 'MongoDB ObjectId của User (ShippingUnit)' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy đơn vị vận chuyển' })
  @Roles(Role.Admin)
  updateCoverage(
    @Param('userId', ParseMongoIdPipe) userId: string,
    @Body() dto: UpdateCoverageDto,
  ) {
    return this.shippingUnitsService.updateCoverage(userId, dto);
  }

  // ─── ShippingUnit: self ───────────────────────────────────────────────────

  @Get('me')
  @ApiOperation({ summary: '[ShippingUnit] Xem profile đơn vị của mình' })
  @Roles(Role.ShippingUnit)
  getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.shippingUnitsService.findMyProfile(user.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: '[ShippingUnit] Cập nhật thông tin đơn vị' })
  @Roles(Role.ShippingUnit)
  updateMyProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateShippingUnitDto) {
    return this.shippingUnitsService.updateMyProfile(user.sub, dto);
  }
}

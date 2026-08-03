import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
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
import { CreatePriceScheduleDto } from './dto/create-price-schedule.dto';
import { ProductsService } from './products.service';

@ApiTags('Price Schedules')
@ApiCookieAuth()
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('price-schedules')
export class PriceSchedulesController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(Role.Owner, Role.Admin)
  @ApiOperation({
    summary: '[Owner/Admin] Lên lịch điều chỉnh giá sản phẩm (Hạ giá gốc hoặc Khuyến mãi Sale)',
    description: 'Hạ giá gốc chỉ cần startDate; Sale khuyến mãi cần cả startDate và endDate.',
  })
  createPriceSchedule(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePriceScheduleDto,
  ) {
    return this.productsService.createPriceSchedule(dto, user.sub);
  }

  @Get('product/:productId')
  @ApiOperation({
    summary: 'Lấy danh sách các đợt lên lịch giá của một sản phẩm',
  })
  @ApiParam({ name: 'productId', description: 'ID MongoDB hoặc productId của sản phẩm' })
  getPriceSchedulesByProduct(@Param('productId') productId: string) {
    return this.productsService.getPriceSchedulesByProduct(productId);
  }

  @Delete(':id')
  @Roles(Role.Owner, Role.Admin)
  @ApiOperation({
    summary: '[Owner/Admin] Hủy đợt lên lịch giá (Nếu chưa áp dụng hoặc đang diễn ra)',
  })
  @ApiParam({ name: 'id', description: 'ID MongoDB của đợt lên lịch giá' })
  cancelPriceSchedule(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.productsService.cancelPriceSchedule(id, user.sub);
  }
}

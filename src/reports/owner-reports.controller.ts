import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { RevenueQueryDto } from './dto/revenue-query.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiCookieAuth()
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Owner)
@Controller('owner')
export class OwnerReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: '[Owner] Dashboard của shop hiện tại',
    description:
      'Tổng hợp order item, doanh thu, sản phẩm và coupon theo owner ID trong JWT.',
  })
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.reportsService.getOwnerDashboard(user.sub);
  }

  @Get('analytics')
  @ApiOperation({
    summary: '[Owner] Thống kê kinh doanh, biểu đồ doanh thu và top sản phẩm',
  })
  getAnalytics(
    @CurrentUser() user: JwtPayload,
    @Query() query: RevenueQueryDto,
  ) {
    return this.reportsService.getOwnerAnalytics(
      user.sub,
      query.period || '30days',
    );
  }

  @Get('ai-trends')
  @ApiOperation({ summary: '[Owner] Nhận báo cáo phân tích xu hướng mua hàng từ AI' })
  getAiTrendReport(@CurrentUser() user: JwtPayload) {
    return this.reportsService.getAiTrendReport(user.sub);
  }
}

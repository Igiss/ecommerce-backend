import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ReportsService } from './reports.service';
import { RevenueQueryDto } from './dto/revenue-query.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  @ApiOperation({ summary: '[Admin] Xem thống kê tổng user, sản phẩm, đơn hàng, doanh thu và sản phẩm bán chạy' })
  getOverview() {
    return this.reportsService.getOverview();
  }

  @Get('dashboard')
  @ApiOperation({ summary: '[Admin] Dashboard counters and revenue' })
  getDashboard() {
    return this.reportsService.getDashboard();
  }

  @Get('revenue-chart')
  @ApiOperation({ summary: '[Admin] Revenue chart for 7 days, 30 days, or 12 months' })
  getRevenueChart(@Query() query: RevenueQueryDto) {
    return this.reportsService.getRevenueChart(query.period || '7days');
  }

  @Get('top-products')
  @ApiOperation({ summary: '[Admin] Top 10 best-selling products' })
  getTopProducts() {
    return this.reportsService.getTopProducts();
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ReportsService } from './reports.service';
import { RevenueQueryDto } from './dto/revenue-query.dto';
import { ReportDateQueryDto } from './dto/report-date-query.dto';
import { AdminShopComparisonQueryDto } from './dto/admin-shop-comparison-query.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('admin/shops-comparison')
  @ApiOperation({
    summary: '[Admin] Thống kê so sánh chi tiết số lượng bán, doanh thu và đơn hàng giữa các Shop',
  })
  getShopsComparison(@Query() query: AdminShopComparisonQueryDto) {
    return this.reportsService.getAdminShopsComparison(query);
  }

  @Get('admin/shops-trend-chart')
  @ApiOperation({
    summary: '[Admin] Biểu đồ so sánh xu hướng bán hàng của các Shop hàng đầu theo thời gian',
  })
  getShopsTrendChart(@Query() query: AdminShopComparisonQueryDto) {
    return this.reportsService.getAdminShopsTrendChart(query);
  }

  @Get('admin/shops-category-breakdown')
  @ApiOperation({
    summary: '[Admin] Thống kê thị phần và số lượng bán của các Shop theo từng Danh mục sản phẩm',
  })
  getShopsCategoryBreakdown(@Query() query: ReportDateQueryDto) {
    return this.reportsService.getAdminShopsCategoryBreakdown(query);
  }

  @Get('overview')
  @ApiOperation({
    summary: '[Admin/Owner] Xem thống kê toàn hệ thống hoặc sản phẩm của owner',
  })
  getOverview(@CurrentUser() user: JwtPayload, @Query() query: ReportDateQueryDto) {
    return this.reportsService.getOverview(this.getOwnerId(user), query);
  }

  @Get('dashboard')
  @ApiOperation({ summary: '[Admin/Owner] Dashboard và doanh thu theo phạm vi quyền' })
  getDashboard(@CurrentUser() user: JwtPayload, @Query() query: ReportDateQueryDto) {
    return this.reportsService.getDashboard(this.getOwnerId(user), query);
  }

  @Get('analytics')
  @ApiOperation({
    summary: '[Admin] Thống kê điều hành, biểu đồ và cảnh báo toàn hệ thống',
  })
  getAnalytics(@Query() query: RevenueQueryDto) {
    return this.reportsService.getAdminAnalytics(query.period || '30days');
  }

  @Get('revenue-chart')
  @ApiOperation({ summary: '[Admin/Owner] Biểu đồ doanh thu theo phạm vi quyền' })
  getRevenueChart(@CurrentUser() user: JwtPayload, @Query() query: RevenueQueryDto) {
    return this.reportsService.getRevenueChart(
      query.period || '7days',
      this.getOwnerId(user),
    );
  }

  @Get('top-products')
  @ApiOperation({ summary: '[Admin/Owner] Top 10 sản phẩm bán chạy theo phạm vi quyền' })
  getTopProducts(@CurrentUser() user: JwtPayload, @Query() query: ReportDateQueryDto) {
    return this.reportsService.getTopProducts(this.getOwnerId(user), query);
  }

  @Get('ai-trends')
  @ApiOperation({ summary: '[Admin/Owner] Nhận báo cáo phân tích xu hướng mua hàng từ AI' })
  async getAiTrendReport(@CurrentUser() user: JwtPayload) {
    const report = await this.reportsService.getAiTrendReport(this.getOwnerId(user));
    return { report };
  }

  private getOwnerId(user: JwtPayload) {
    return user.role === Role.Owner ? user.sub : undefined;
  }
}

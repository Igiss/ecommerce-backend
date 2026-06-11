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

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin, Role.Owner)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

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

  private getOwnerId(user: JwtPayload) {
    return user.role === Role.Owner ? user.sub : undefined;
  }
}

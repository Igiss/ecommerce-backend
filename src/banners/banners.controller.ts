import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BannersService } from './banners.service';
import { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Banners')
@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  @ApiOperation({ summary: '[Public] Lấy danh sách banner đang kích hoạt cho trang chủ' })
  getActiveBanners() {
    return this.bannersService.getActiveBanners();
  }

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @ApiOperation({ summary: '[Admin/Owner] Lấy tất cả danh sách banner' })
  getAllAdminBanners() {
    return this.bannersService.getAllAdminBanners();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @ApiOperation({ summary: '[Admin/Owner] Tạo mới banner' })
  createBanner(@Body() dto: CreateBannerDto) {
    return this.bannersService.createBanner(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @ApiOperation({ summary: '[Admin/Owner] Cập nhật thông tin banner' })
  updateBanner(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.bannersService.updateBanner(id, dto);
  }

  @Patch(':id/toggle')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @ApiOperation({ summary: '[Admin/Owner] Bật/tắt trạng thái hiển thị banner' })
  toggleActive(@Param('id') id: string) {
    return this.bannersService.toggleActive(id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Owner)
  @ApiOperation({ summary: '[Admin/Owner] Xóa banner' })
  deleteBanner(@Param('id') id: string) {
    return this.bannersService.deleteBanner(id);
  }
}

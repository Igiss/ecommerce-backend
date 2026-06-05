import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateCustomDesignDto } from './dto/create-custom-design.dto';
import { UpdateCustomDesignStatusDto } from './dto/update-custom-design-status.dto';
import { CustomDesignsService } from './custom-designs.service';

@ApiTags('Custom Designs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('custom-designs')
export class CustomDesignsController {
  constructor(private readonly customDesignsService: CustomDesignsService) {}

  @Post()
  @ApiOperation({ summary: '[User] Tạo yêu cầu thiết kế/in 3D/custom theo yêu cầu' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCustomDesignDto) {
    return this.customDesignsService.create(user.sub, dto);
  }

  @Get('me')
  @ApiOperation({ summary: '[User] Lấy danh sách yêu cầu custom của tài khoản đang đăng nhập' })
  findMine(@CurrentUser() user: JwtPayload) {
    return this.customDesignsService.findMine(user.sub);
  }

  @Get()
  @ApiOperation({ summary: '[Admin/Staff] Lấy danh sách tất cả yêu cầu custom' })
  @Roles(Role.Admin, Role.Staff)
  findAll() {
    return this.customDesignsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '[Owner/Admin/Staff] Xem chi tiết yêu cầu custom' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.customDesignsService.findOne(id, user.sub, user.role);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '[Admin/Staff] Cập nhật trạng thái yêu cầu custom và ghi chú admin' })
  @Roles(Role.Admin, Role.Staff)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateCustomDesignStatusDto) {
    return this.customDesignsService.updateStatus(id, dto);
  }
}

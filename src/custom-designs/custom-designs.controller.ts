import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
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
  @ApiOperation({ summary: '[Admin/Owner] Lấy danh sách tất cả yêu cầu custom' })
  @Roles(Role.Admin, Role.Owner)
  findAll() {
    return this.customDesignsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '[User/Admin/Owner] Xem chi tiết yêu cầu custom' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của yêu cầu custom' })
  @ApiBadRequestResponse({ description: 'ID yêu cầu custom không hợp lệ' })
  findOne(@CurrentUser() user: JwtPayload, @Param('id', ParseMongoIdPipe) id: string) {
    return this.customDesignsService.findOne(id, user.sub, user.role);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '[Admin/Owner] Cập nhật trạng thái yêu cầu custom và ghi chú admin' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của yêu cầu custom' })
  @Roles(Role.Admin, Role.Owner)
  updateStatus(@Param('id', ParseMongoIdPipe) id: string, @Body() dto: UpdateCustomDesignStatusDto) {
    return this.customDesignsService.updateStatus(id, dto);
  }
}

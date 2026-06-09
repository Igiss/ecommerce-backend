import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: '[Admin] Lấy danh sách tất cả user' })
  @Roles(Role.Admin)
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '[Admin] Xem chi tiết user theo id' })
  @Roles(Role.Admin)
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của user' })
  @ApiBadRequestResponse({ description: 'ID user không hợp lệ' })
  @ApiNotFoundResponse({ description: 'Không tìm thấy user' })
  findOne(@Param('id', ParseMongoIdPipe) id: string) {
    return this.usersService.findById(id);
  }

  @Patch('profile')
  @ApiOperation({ summary: '[User] Cập nhật profile của tài khoản đang đăng nhập' })
  updateProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '[Admin] Duyệt, khóa hoặc mở khóa tài khoản' })
  @Roles(Role.Admin)
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của user' })
  updateStatus(@Param('id', ParseMongoIdPipe) id: string, @Body() dto: UpdateUserStatusDto) {
    return this.usersService.updateStatus(id, dto);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: '[Admin] Đổi role user' })
  @Roles(Role.Admin)
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của user' })
  updateRole(@Param('id', ParseMongoIdPipe) id: string, @Body() dto: UpdateUserRoleDto) {
    return this.usersService.updateRole(id, dto);
  }
}

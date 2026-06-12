import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: '[Admin/Owner] Tạo thông báo gửi tới user' })
  @Roles(Role.Admin)
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  @Get('me')
  @ApiOperation({ summary: '[User] Lấy danh sách thông báo của tài khoản đang đăng nhập' })
  findMine(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.findMine(user.sub);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: '[User] Đánh dấu một thông báo là đã đọc' })
  @ApiParam({ name: 'id', description: 'MongoDB ObjectId của thông báo' })
  @ApiBadRequestResponse({ description: 'ID thông báo không hợp lệ' })
  markAsRead(@CurrentUser() user: JwtPayload, @Param('id', ParseMongoIdPipe) id: string) {
    return this.notificationsService.markAsRead(id, user.sub);
  }

  @Patch('read-all')
  @ApiOperation({ summary: '[User] Đánh dấu tất cả thông báo là đã đọc' })
  markAllAsRead(@CurrentUser() user: JwtPayload) {
    return this.notificationsService.markAllAsRead(user.sub);
  }
}

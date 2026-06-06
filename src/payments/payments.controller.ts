import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: '[User] Tạo payment mock cho COD/BANKING/MOMO' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(user.sub, dto);
  }

  @Get('me')
  @ApiOperation({ summary: '[User] Lấy lịch sử thanh toán của tài khoản đang đăng nhập' })
  findMine(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.findMine(user.sub);
  }

  @Get()
  @ApiOperation({ summary: '[Admin/Staff] Lấy danh sách tất cả payment' })
  @Roles(Role.Admin, Role.Staff)
  findAll() {
    return this.paymentsService.findAll();
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '[Admin/Staff] Cập nhật trạng thái payment mock' })
  @Roles(Role.Admin, Role.Staff)
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePaymentStatusDto) {
    return this.paymentsService.updateStatus(id, dto);
  }

  @Post('vnpay/:orderId/url')
  @ApiOperation({ summary: '[User] Create a VNPay payment URL for an order' })
  createVnpayUrl(
    @CurrentUser() user: JwtPayload,
    @Param('orderId') orderId: string,
    @Req() request: Request,
  ) {
    return this.paymentsService.createVnpayUrl(user.sub, orderId, request.ip);
  }
}

@ApiTags('Payments')
@Controller('payments/vnpay')
export class VnpayController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('return')
  async handleReturn(
    @Query() query: Record<string, string>,
    @Res() response: Response,
  ) {
    const result = await this.paymentsService.handleVnpayCallback(query);
    const redirectUrl = this.paymentsService.buildVnpayRedirect(result);
    return response.redirect(redirectUrl);
  }

  @Get('ipn')
  handleIpn(@Query() query: Record<string, string>) {
    return this.paymentsService.handleVnpayIpn(query);
  }
}

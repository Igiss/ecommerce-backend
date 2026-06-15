import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('me')
  @ApiOperation({ summary: '[User] Get payment history' })
  findMine(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.findMine(user.sub);
  }

  @Get()
  @ApiOperation({ summary: '[Admin] Get all payments' })
  @Roles(Role.Admin)
  findAll() {
    return this.paymentsService.findAll();
  }

  @Patch(':id/status')
  @ApiOperation({ summary: '[Admin] Update payment status' })
  @ApiParam({ name: 'id', description: 'Payment MongoDB ObjectId' })
  @ApiBadRequestResponse({ description: 'Invalid payment ID' })
  @Roles(Role.Admin)
  updateStatus(
    @Param('id', ParseMongoIdPipe) id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.paymentsService.updateStatus(id, dto);
  }

  @Post('vnpay/:orderId/url')
  @ApiOperation({ summary: '[User] Create VNPay URL for an order' })
  @ApiParam({ name: 'orderId', description: 'Order MongoDB ObjectId' })
  createVnpayUrl(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseMongoIdPipe) orderId: string,
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
  @ApiOperation({ summary: '[Public/VNPay] Handle return URL' })
  async handleReturn(
    @Query() query: Record<string, string>,
    @Res() response: Response,
  ) {
    const result = await this.paymentsService.handleVnpayCallback(query);
    return response.redirect(this.paymentsService.buildVnpayRedirect(result));
  }

  @Get('ipn')
  @ApiOperation({ summary: '[Public/VNPay] Handle IPN callback' })
  handleIpn(@Query() query: Record<string, string>) {
    return this.paymentsService.handleVnpayIpn(query);
  }
}

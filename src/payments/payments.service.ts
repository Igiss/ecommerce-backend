import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ReturnQueryFromVNPay, VNPay, VnpLocale } from 'vnpay';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { Order, OrderDocument, PaymentMethod } from '../database/schemas/order.schema';
import { Payment, PaymentDocument } from '../database/schemas/payment.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly configService: ConfigService,
  ) {}

  async create(userId: string, dto: CreatePaymentDto) {
    const order = await this.orderModel.findById(dto.orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const status = dto.status || PaymentStatus.Unpaid;
    const payment = await this.paymentModel.create({
      orderId: new Types.ObjectId(dto.orderId),
      userId: new Types.ObjectId(userId),
      method: dto.method,
      amount: dto.amount,
      status,
      transactionCode: dto.transactionCode,
      paidAt: status === PaymentStatus.Paid ? new Date() : undefined,
    });

    order.paymentMethod = dto.method;
    order.paymentStatus = status;
    await order.save();

    return payment;
  }

  async findAll() {
    return this.paymentModel
      .find()
      .populate('orderId')
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findMine(userId: string) {
    return this.paymentModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async updateStatus(id: string, dto: UpdatePaymentStatusDto) {
    const payment = await this.paymentModel
      .findByIdAndUpdate(
        id,
        {
          status: dto.status,
          transactionCode: dto.transactionCode,
          paidAt: dto.status === PaymentStatus.Paid ? new Date() : undefined,
        },
        { new: true },
      )
      .exec();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    await this.orderModel.findByIdAndUpdate(payment.orderId, { paymentStatus: dto.status }).exec();

    return payment;
  }

  async createVnpayUrl(userId: string, orderId: string, ipAddress?: string) {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId.toString() !== userId) {
      throw new ForbiddenException('You can only pay for your own order');
    }

    const transactionCode = `${order.id}_${Date.now()}`;
    await this.paymentModel.create({
      orderId: order._id,
      userId: order.userId,
      method: PaymentMethod.VNPay,
      amount: order.totalAmount,
      status: PaymentStatus.Unpaid,
      transactionCode,
      metadata: {},
    });

    order.paymentMethod = PaymentMethod.VNPay;
    await order.save();

    const paymentUrl = this.getVnpay().buildPaymentUrl({
      vnp_Amount: order.totalAmount,
      vnp_IpAddr: this.normalizeIp(ipAddress),
      vnp_TxnRef: transactionCode,
      vnp_OrderInfo: `Thanh toan don hang ${order.id}`,
      vnp_ReturnUrl:
        this.configService.get<string>('VNP_RETURN_URL') ||
        'http://localhost:3000/api/payments/vnpay/return',
      vnp_Locale: VnpLocale.VN,
    });

    return { paymentUrl, transactionCode };
  }

  async handleVnpayCallback(query: Record<string, string>) {
    const verification = this.getVnpay().verifyReturnUrl(query as ReturnQueryFromVNPay);
    const transactionCode = query.vnp_TxnRef || '';
    const orderId = transactionCode.split('_')[0];
    const success = verification.isVerified && query.vnp_ResponseCode === '00';

    if (success) {
      await this.confirmVnpayPayment(orderId, transactionCode, query);
    }

    return {
      status: success ? 'success' : 'failed',
      orderId,
      responseCode: query.vnp_ResponseCode,
    };
  }

  async handleVnpayIpn(query: Record<string, string>) {
    const verification = this.getVnpay().verifyIpnCall(query as ReturnQueryFromVNPay);
    if (!verification.isVerified) {
      return { RspCode: '97', Message: 'Invalid Signature' };
    }

    const transactionCode = query.vnp_TxnRef || '';
    const orderId = transactionCode.split('_')[0];
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      return { RspCode: '01', Message: 'Order Not Found' };
    }

    if (Number(query.vnp_Amount) !== order.totalAmount * 100) {
      return { RspCode: '04', Message: 'Invalid Amount' };
    }

    if (order.paymentStatus === PaymentStatus.Paid) {
      return { RspCode: '02', Message: 'Order Already Confirmed' };
    }

    if (query.vnp_ResponseCode === '00') {
      await this.confirmVnpayPayment(orderId, transactionCode, query);
    }
    return { RspCode: '00', Message: 'Confirm Success' };
  }

  buildVnpayRedirect(result: {
    status: string;
    orderId: string;
    responseCode?: string;
  }) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';
    const params = new URLSearchParams({
      status: result.status,
      orderId: result.orderId,
      responseCode: result.responseCode || '',
    });
    return `${frontendUrl}/vnpay-return?${params.toString()}`;
  }

  private async confirmVnpayPayment(
    orderId: string,
    transactionCode: string,
    metadata: Record<string, string>,
  ) {
    const paidAt = new Date();
    await Promise.all([
      this.orderModel.findByIdAndUpdate(orderId, {
        paymentMethod: PaymentMethod.VNPay,
        paymentStatus: PaymentStatus.Paid,
      }),
      this.paymentModel.findOneAndUpdate(
        { transactionCode },
        { status: PaymentStatus.Paid, paidAt, metadata },
      ),
    ]);
  }

  private getVnpay() {
    return new VNPay({
      tmnCode: this.configService.get<string>('VNP_TMN_CODE') || '',
      secureSecret: this.configService.get<string>('VNP_HASH_SECRET') || '',
      vnpayHost: this.configService.get<string>('VNP_URL') || 'https://sandbox.vnpayment.vn',
      testMode: this.configService.get<string>('NODE_ENV') !== 'production',
    });
  }

  private normalizeIp(ipAddress?: string) {
    return (ipAddress || '127.0.0.1').replace('::ffff:', '').split(',')[0].trim();
  }
}

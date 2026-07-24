import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReturnQueryFromVNPay, VNPay, VnpLocale } from 'vnpay';
import { OrderStatus } from '../common/enums/order-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { Order, OrderDocument, PaymentMethod } from '../database/schemas/order.schema';
import { Payment, PaymentDocument } from '../database/schemas/payment.schema';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../database/schemas/notification.schema';
import { SettingsService } from '../settings/settings.service';
import { SettingDocument } from '../database/schemas/setting.schema';
import { SePayPgClient } from './sepay-pg.client';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly settingsService: SettingsService,
  ) {}

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
    const existingPayment = await this.paymentModel.findById(id).exec();
    if (!existingPayment) {
      throw new NotFoundException('Payment not found');
    }

    const paidAt =
      dto.status === PaymentStatus.Paid
        ? existingPayment.paidAt || new Date()
        : existingPayment.paidAt;
    const refundedAt = dto.status === PaymentStatus.Refunded ? new Date() : undefined;
    const payment = await this.paymentModel
      .findByIdAndUpdate(
        id,
        {
          status: dto.status,
          transactionCode: dto.transactionCode,
          providerTransactionId: dto.providerTransactionId,
          failureReason: dto.failureReason,
          paidAt,
          refundedAt,
          refundAmount: dto.refundAmount || 0,
        },
        { new: true },
      )
      .exec();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    await this.orderModel
      .findByIdAndUpdate(payment.orderId, {
        paymentStatus: dto.status,
        paidAt,
        transactionCode: dto.transactionCode || payment.transactionCode,
      })
      .exec();

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
    if (order.paymentStatus === PaymentStatus.Paid) {
      throw new BadRequestException('Order has already been paid');
    }
    if (order.orderStatus === OrderStatus.Cancelled) {
      throw new BadRequestException('Order has been cancelled');
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
    order.transactionCode = transactionCode;
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
    if (!verification.isVerified) {
      return {
        status: 'failed',
        orderId: (query.vnp_TxnRef || '').split('_')[0],
        responseCode: '97',
      };
    }

    const transactionCode = query.vnp_TxnRef || '';
    const orderId = transactionCode.split('_')[0];
    const success = query.vnp_ResponseCode === '00';

    if (success) {
      await this.confirmVnpayPayment(orderId, transactionCode, query);
    } else if (orderId) {
      await this.markVnpayFailed(transactionCode, query);
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
    } else {
      await this.markVnpayFailed(transactionCode, query);
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
    const providerTransactionId = metadata.vnp_TransactionNo;
    const [updatedOrder] = await Promise.all([
      this.orderModel.findByIdAndUpdate(
        orderId,
        {
          paymentMethod: PaymentMethod.VNPay,
          paymentStatus: PaymentStatus.Paid,
          paidAt,
          transactionCode,
        },
        { new: true },
      ),
      this.paymentModel.findOneAndUpdate(
        { transactionCode },
        {
          status: PaymentStatus.Paid,
          paidAt,
          providerTransactionId,
          failureReason: undefined,
          metadata,
        },
      ),
    ]);

    if (updatedOrder) {
      try {
        await this.notificationsService.create({
          userId: updatedOrder.userId.toString(),
          title: 'Thanh toán thành công!',
          message: `Đơn hàng #${orderId} của bạn đã được thanh toán thành công qua VNPay. Chúng tôi đang xử lý và chuẩn bị đơn hàng.`,
          type: NotificationType.Order,
          metadata: { orderId },
        });
      } catch (err) {
        console.error('Failed to send payment success notification:', err);
      }
    }
  }

  private async markVnpayFailed(
    transactionCode: string,
    metadata: Record<string, string>,
  ) {
    const payment = await this.paymentModel.findOneAndUpdate(
      { transactionCode },
      {
        status: PaymentStatus.Failed,
        failureReason: metadata.vnp_ResponseCode || 'VNPay payment failed',
        providerTransactionId: metadata.vnp_TransactionNo,
        metadata,
      },
      { new: true },
    );
    if (payment) {
      const order = await this.orderModel.findByIdAndUpdate(
        payment.orderId,
        {
          paymentStatus: PaymentStatus.Failed,
          transactionCode,
        },
        { new: true },
      );

      if (order) {
        try {
          await this.notificationsService.create({
            userId: order.userId.toString(),
            title: 'Thanh toán thất bại',
            message: `Thanh toán cho đơn hàng #${order._id.toString()} không thành công. Bạn có thể thử thanh toán lại trong mục chi tiết đơn hàng.`,
            type: NotificationType.Order,
            metadata: { orderId: order._id.toString() },
          });
        } catch (err) {
          console.error('Failed to send payment failure notification:', err);
        }
      }
    }
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
    let ip = ipAddress || '127.0.0.1';
    ip = ip.replace('::ffff:', '').split(',')[0].trim();
    if (ip === '::1') {
      return '127.0.0.1';
    }
    return ip;
  }

  // --- SEPAY INTEGRATION METHODS ---

  async createSepayQr(userId: string, orderId: string) {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId.toString() !== userId) {
      throw new ForbiddenException('You can only pay for your own order');
    }
    if (order.paymentStatus === PaymentStatus.Paid) {
      throw new BadRequestException('Order has already been paid');
    }
    if (order.orderStatus === OrderStatus.Cancelled) {
      throw new BadRequestException('Order has been cancelled');
    }

    // Payment syntax code: DH + last 6 characters of Order ID or full Order ID
    const shortCode = order._id.toString().slice(-6).toUpperCase();
    const paymentCode = `DH${shortCode}`;

    // Read SePay config from env or database
    let dbSettings: SettingDocument | null = null;
    try {
      dbSettings = await this.settingsService.getSepaySettings();
    } catch {
      // Fallback
    }

    const bankName = dbSettings?.bankName || this.configService.get<string>('SEPAY_BANK_NAME') || '';
    const accountNumber = dbSettings?.accountNumber || this.configService.get<string>('SEPAY_ACC_NUMBER') || '';
    const accountHolder = dbSettings?.accountHolder || this.configService.get<string>('SEPAY_ACC_HOLDER') || '';

    // SePay official VietQR URL endpoint format
    const qrUrl = `https://qr.sepay.vn/img?acc=${accountNumber}&bank=${bankName}&amount=${order.totalAmount}&des=${paymentCode}`;

    // Upsert payment document
    await this.paymentModel.findOneAndUpdate(
      { orderId: order._id, method: PaymentMethod.SePay },
      {
        orderId: order._id,
        userId: order.userId,
        method: PaymentMethod.SePay,
        amount: order.totalAmount,
        status: PaymentStatus.Unpaid,
        transactionCode: paymentCode,
        metadata: {
          qrUrl,
          bankName,
          accountNumber,
          accountHolder,
          paymentCode,
        },
      },
      { upsert: true, new: true },
    );

    order.paymentMethod = PaymentMethod.SePay;
    order.transactionCode = paymentCode;
    await order.save();

    return {
      orderId: order._id.toString(),
      totalAmount: order.totalAmount,
      paymentCode,
      qrUrl,
      bankName,
      accountNumber,
      accountHolder,
    };
  }

  async createSepayCheckout(userId: string, orderId: string) {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId.toString() !== userId) {
      throw new ForbiddenException('You can only pay for your own order');
    }
    if (order.paymentStatus === PaymentStatus.Paid) {
      throw new BadRequestException('Order has already been paid');
    }
    if (order.orderStatus === OrderStatus.Cancelled) {
      throw new BadRequestException('Order has been cancelled');
    }

    const shortCode = order._id.toString().slice(-6).toUpperCase();
    const invoiceNumber = `DH${shortCode}`;

    const env = (this.configService.get<string>('SEPAY_ENV') as 'sandbox' | 'production') || 'sandbox';
    const merchant_id = this.configService.get<string>('SEPAY_MERCHANT_ID') || '';
    const secret_key = this.configService.get<string>('SEPAY_SECRET_KEY') || '';

    const client = new SePayPgClient({
      env,
      merchant_id,
      secret_key,
    });

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

    const checkoutURL = client.checkout.initCheckoutUrl();
    const checkoutFormfields = client.checkout.initOneTimePaymentFields({
      payment_method: 'BANK_TRANSFER',
      order_invoice_number: invoiceNumber,
      order_amount: order.totalAmount,
      currency: 'VND',
      order_description: `Thanh toan don hang ${invoiceNumber}`,
      success_url: `${frontendUrl}/orders/${order.id}?payment=success`,
      error_url: `${frontendUrl}/orders/${order.id}?payment=error`,
      cancel_url: `${frontendUrl}/orders/${order.id}?payment=cancel`,
    });

    order.paymentMethod = PaymentMethod.SePay;
    order.transactionCode = invoiceNumber;
    await order.save();

    return {
      orderId: order._id.toString(),
      checkoutURL,
      checkoutFormfields,
    };
  }

  async handleSepayWebhook(payload: Record<string, unknown>, authHeader?: string) {
    let dbSettings: SettingDocument | null = null;
    try {
      dbSettings = await this.settingsService.getSepaySettings();
    } catch {
      // Fallback
    }
    const sepayApiKey = dbSettings?.apiKey || this.configService.get<string>('SEPAY_API_KEY');
    
    // Validate Authorization header if SEPAY_API_KEY is configured
    if (sepayApiKey) {
      const token = (authHeader || '').replace('Bearer ', '').trim();
      if (token !== sepayApiKey) {
        return { success: false, message: 'Unauthorized Webhook request' };
      }
    }

    const { code, content, transferAmount, referenceCode, gateway, accountNumber } = payload;
    
    // Extract payment code from code field or content string (regex DH[A-Z0-9]+)
    let paymentCode = String(code || '');
    if (!paymentCode && content) {
      const match = String(content).match(/DH[A-Z0-9]+/i);
      if (match) {
        paymentCode = match[0].toUpperCase();
      }
    }

    if (!paymentCode) {
      return { success: false, message: 'No payment code found in transaction content' };
    }

    // Find order by transactionCode or short ID
    let order = await this.orderModel.findOne({ transactionCode: paymentCode }).exec();
    if (!order) {
      // Fallback search by short Mongo ID
      const cleanCode = paymentCode.replace(/^DH/i, '').toLowerCase();
      const allOrders = await this.orderModel.find({ paymentStatus: { $ne: PaymentStatus.Paid } }).exec();
      order = allOrders.find((o) => o._id.toString().toLowerCase().endsWith(cleanCode)) || null;
    }

    if (!order) {
      return { success: false, message: `Order not found for code: ${paymentCode}` };
    }

    if (order.paymentStatus === PaymentStatus.Paid) {
      return { success: true, message: 'Order already paid' };
    }

    const amountPaid = Number(transferAmount || 0);
    if (amountPaid < order.totalAmount) {
      return { success: false, message: `Amount paid (${amountPaid}) is less than total order amount (${order.totalAmount})` };
    }

    // Mark order & payment as Paid
    const paidAt = new Date();
    order.paymentStatus = PaymentStatus.Paid;
    order.orderStatus = OrderStatus.Confirmed;
    order.paidAt = paidAt;
    order.transactionCode = paymentCode;
    await order.save();

    const refCodeStr = String(referenceCode || '');
    await this.paymentModel.findOneAndUpdate(
      { orderId: order._id },
      {
        status: PaymentStatus.Paid,
        paidAt,
        providerTransactionId: refCodeStr || `SEPAY_${Date.now()}`,
        metadata: {
          gateway,
          accountNumber,
          referenceCode,
          content,
          transferAmount: amountPaid,
          payload,
        },
      },
    );

    // Send Real-time Notification to User
    try {
      await this.notificationsService.create({
        userId: order.userId.toString(),
        title: 'Thanh toán SePay thành công! 🎉',
        message: `Hệ thống đã nhận được ${amountPaid.toLocaleString('vi-VN')}đ cho đơn hàng #${order._id.toString()}. Cửa hàng đang chuẩn bị giao cho bạn!`,
        type: NotificationType.Order,
        metadata: { orderId: order._id.toString() },
      });
    } catch (err) {
      console.error('Failed to send SePay notification:', err);
    }

    return {
      success: true,
      orderId: order._id.toString(),
      message: 'SePay payment confirmed successfully',
    };
  }

  async getSepayStatus(orderId: string) {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return {
      orderId: order._id.toString(),
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      paidAt: order.paidAt,
      isPaid: order.paymentStatus === PaymentStatus.Paid,
    };
  }
}


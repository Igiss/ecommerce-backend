import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { Order, OrderDocument } from '../database/schemas/order.schema';
import { Payment, PaymentDocument } from '../database/schemas/payment.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
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
}

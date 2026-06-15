import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { PaymentMethod } from './order.schema';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ enum: Object.values(PaymentMethod), required: true })
  method: PaymentMethod;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ enum: Object.values(PaymentStatus), default: PaymentStatus.Unpaid })
  status: PaymentStatus;

  @Prop({ trim: true })
  transactionCode?: string;

  @Prop({ trim: true })
  providerTransactionId?: string;

  @Prop()
  paidAt?: Date;

  @Prop({ trim: true })
  failureReason?: string;

  @Prop()
  refundedAt?: Date;

  @Prop({ min: 0, default: 0 })
  refundAmount: number;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, unknown>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ userId: 1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ method: 1 });
PaymentSchema.index({ transactionCode: 1 }, { unique: true, sparse: true });
PaymentSchema.index({ createdAt: -1 });

PaymentSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const transformed = ret as unknown as Record<string, unknown>;
    delete transformed._id;
    return ret;
  },
});

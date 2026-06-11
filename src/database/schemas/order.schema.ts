import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { ProductType } from './product.schema';

export type OrderDocument = HydratedDocument<Order>;

export enum PaymentMethod {
  COD = 'COD',
  Banking = 'BANKING',
  Momo = 'MOMO',
  VNPay = 'VNPAY',
}

@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product' })
  productId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'CustomDesign' })
  customDesignId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  productName: string;

  @Prop({ enum: Object.values(ProductType), required: true })
  productType: ProductType;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, min: 0 })
  total: number;

  @Prop()
  image?: string;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ _id: false })
export class ShippingAddress {
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ required: true, trim: true })
  address: string;

  @Prop({ required: true, trim: true })
  ward: string;

  @Prop({ required: true, trim: true })
  province: string;
}

export const ShippingAddressSchema = SchemaFactory.createForClass(ShippingAddress);

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({ type: ShippingAddressSchema, required: true })
  shippingAddress: ShippingAddress;

  @Prop({ enum: Object.values(PaymentMethod), required: true })
  paymentMethod: PaymentMethod;

  @Prop({ enum: Object.values(PaymentStatus), default: PaymentStatus.Unpaid })
  paymentStatus: PaymentStatus;

  @Prop({ enum: Object.values(OrderStatus), default: OrderStatus.Pending })
  orderStatus: OrderStatus;

  @Prop({ default: '', trim: true })
  note: string;

  @Prop({ trim: true })
  cancelReason?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ userId: 1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ paymentMethod: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'items.productId': 1 });
OrderSchema.index({ 'items.customDesignId': 1 });

OrderSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const transformed = ret as unknown as Record<string, unknown>;
    delete transformed._id;
    return ret;
  },
});

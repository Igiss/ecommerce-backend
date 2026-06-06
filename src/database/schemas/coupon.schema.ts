import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CouponDocument = HydratedDocument<Coupon>;

export enum DiscountType {
  Percentage = 'percentage',
  Fixed = 'fixed',
}

@Schema({ timestamps: true })
export class Coupon {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ enum: Object.values(DiscountType), required: true })
  discountType: DiscountType;

  @Prop({ required: true, min: 0 })
  discountAmount: number;

  @Prop({ default: 0, min: 0 })
  minOrderValue: number;

  @Prop({ min: 0 })
  maxDiscount?: number;

  @Prop({ required: true })
  expiryDate: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 100, min: 1 })
  usageLimit: number;

  @Prop({ default: 0, min: 0 })
  usedCount: number;
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);

CouponSchema.index({ code: 1 }, { unique: true });
CouponSchema.index({ isActive: 1, expiryDate: 1 });


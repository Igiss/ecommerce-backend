import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CouponDocument = HydratedDocument<Coupon>;

export enum DiscountType {
  Percentage = 'percentage',
  Fixed = 'fixed',
}

@Schema({ timestamps: true })
export class Coupon {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  ownerId?: Types.ObjectId;

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

  @Prop()
  startsAt?: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 100, min: 1 })
  usageLimit: number;

  @Prop({ default: 0, min: 0 })
  usedCount: number;

  @Prop({ default: 1, min: 1 })
  perUserLimit: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Product' }], default: [] })
  applicableProductIds: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Category' }], default: [] })
  applicableCategoryIds: Types.ObjectId[];
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);

CouponSchema.index({ isActive: 1, expiryDate: 1 });
CouponSchema.index({ ownerId: 1, createdAt: -1 });

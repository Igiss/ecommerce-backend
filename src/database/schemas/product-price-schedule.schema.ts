import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProductPriceScheduleDocument = HydratedDocument<ProductPriceSchedule>;

export enum PriceAdjustmentType {
  BASE_PRICE_CHANGE = 'base_price_change', // Hạ / Đổi giá gốc
  SALE_CAMPAIGN = 'sale_campaign',         // Sale khuyến mãi có thời hạn
}

export enum DiscountValueType {
  FIXED_PRICE = 'fixed_price',   // Nhập trực tiếp số tiền (VD: 150000)
  PERCENTAGE = 'percentage',     // Giảm theo % (VD: 20 -> 20%)
  AMOUNT_OFF = 'amount_off',     // Giảm trừ số tiền (VD: 30000)
}

export enum ScheduleStatus {
  PENDING = 'pending',     // Chờ đến giờ kích hoạt
  ACTIVE = 'active',       // Đang diễn ra (cho Sale)
  APPLIED = 'applied',     // Đã áp dụng xong vào giá gốc (cho Base Price Change)
  EXPIRED = 'expired',     // Đã hết hạn (cho Sale)
  CANCELLED = 'cancelled', // Đã bị hủy
}

@Schema({ timestamps: true })
export class ProductPriceSchedule {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId: Types.ObjectId;

  @Prop({
    required: true,
    enum: Object.values(PriceAdjustmentType),
  })
  type: PriceAdjustmentType;

  @Prop({
    required: true,
    enum: Object.values(DiscountValueType),
    default: DiscountValueType.FIXED_PRICE,
  })
  valueType: DiscountValueType;

  @Prop({ required: true, min: 0 })
  value: number;

  @Prop({ required: true, min: 0 })
  calculatedPrice: number;

  @Prop({ required: true })
  startDate: Date;

  @Prop()
  endDate?: Date;

  @Prop({
    required: true,
    enum: Object.values(ScheduleStatus),
    default: ScheduleStatus.PENDING,
    index: true,
  })
  status: ScheduleStatus;

  @Prop({ trim: true })
  title?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const ProductPriceScheduleSchema = SchemaFactory.createForClass(ProductPriceSchedule);

ProductPriceScheduleSchema.index({ productId: 1, status: 1 });
ProductPriceScheduleSchema.index({ startDate: 1, endDate: 1 });

ProductPriceScheduleSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const transformed = ret as unknown as Record<string, unknown>;
    transformed.id = transformed._id;
    return transformed;
  },
});

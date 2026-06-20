import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ShippingUnitDocument = HydratedDocument<ShippingUnit>;

/**
 * Profile của đơn vị vận chuyển (1-1 với User có role=shipping_unit).
 * coverageAreas: danh sách khu vực (tỉnh, phường/xã) mà đơn vị này phụ trách giao hàng.
 */
@Schema({ timestamps: true })
export class ShippingUnit {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  companyName: string;

  /** Danh sách khu vực phụ trách */
  @Prop({ type: [{ province: String, ward: String }], default: [] })
  coverageAreas: { province: string; ward: string }[];

  @Prop({ trim: true })
  contactPhone?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  ward?: string;

  @Prop({ trim: true })
  province?: string;
}

export const ShippingUnitSchema = SchemaFactory.createForClass(ShippingUnit);

ShippingUnitSchema.index({ 'coverageAreas.province': 1, 'coverageAreas.ward': 1 });

ShippingUnitSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const transformed = ret as unknown as Record<string, unknown>;
    delete transformed._id;
    return ret;
  },
});

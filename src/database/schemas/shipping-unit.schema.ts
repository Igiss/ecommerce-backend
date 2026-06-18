import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ShippingUnitDocument = HydratedDocument<ShippingUnit>;

/**
 * Profile của đơn vị vận chuyển (1-1 với User có role=shipping_unit).
 * coverageWards: danh sách phường/xã mà đơn vị này phụ trách giao hàng.
 */
@Schema({ timestamps: true })
export class ShippingUnit {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  companyName: string;

  /** Danh sách phường/xã phụ trách, VD: ['Phường Bến Nghé', 'Phường Bến Thành'] */
  @Prop({ type: [String], default: [] })
  coverageWards: string[];

  @Prop({ trim: true })
  contactPhone?: string;

  @Prop({ trim: true })
  address?: string;
}

export const ShippingUnitSchema = SchemaFactory.createForClass(ShippingUnit);

ShippingUnitSchema.index({ coverageWards: 1 });

ShippingUnitSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const transformed = ret as unknown as Record<string, unknown>;
    delete transformed._id;
    return ret;
  },
});

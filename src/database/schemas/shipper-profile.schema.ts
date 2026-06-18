import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ShipperProfileDocument = HydratedDocument<ShipperProfile>;

/**
 * Profile của shipper (1-1 với User có role=shipper).
 * Được tạo bởi ShippingUnit, liên kết qua shippingUnitId.
 */
@Schema({ timestamps: true })
export class ShipperProfile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  /** Đơn vị vận chuyển quản lý shipper này */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  shippingUnitId: Types.ObjectId;

  @Prop({ trim: true })
  vehicleType?: string;  // VD: 'Xe máy', 'Ô tô'

  @Prop({ trim: true })
  licensePlate?: string;

  /** Shipper có đang sẵn sàng nhận đơn không */
  @Prop({ default: true })
  isAvailable: boolean;
}

export const ShipperProfileSchema = SchemaFactory.createForClass(ShipperProfile);

ShipperProfileSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const transformed = ret as unknown as Record<string, unknown>;
    delete transformed._id;
    return ret;
  },
});

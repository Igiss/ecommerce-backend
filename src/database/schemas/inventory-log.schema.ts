import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InventoryLogDocument = HydratedDocument<InventoryLog>;

export enum InventoryLogType {
  RESTOCK = 'RESTOCK',
  UPDATE = 'UPDATE',
  SALE = 'SALE',
  CANCEL_ORDER = 'CANCEL_ORDER',
  RETURN = 'RETURN',
}

@Schema({ timestamps: true })
export class InventoryLog {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  quantityChange: number;

  @Prop({ enum: Object.values(InventoryLogType), required: true })
  type: InventoryLogType;

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  referenceId?: Types.ObjectId;

  @Prop({ trim: true })
  note?: string;
}

export const InventoryLogSchema = SchemaFactory.createForClass(InventoryLog);

InventoryLogSchema.index({ productId: 1, createdAt: -1 });
InventoryLogSchema.index({ type: 1 });
InventoryLogSchema.index({ referenceId: 1 });

InventoryLogSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const transformed = ret as unknown as Record<string, unknown>;
    delete transformed._id;
    return ret;
  },
});

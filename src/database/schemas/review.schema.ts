import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReviewDocument = HydratedDocument<Review>;

export enum ReviewStatus {
  Visible = 'visible',
  Hidden = 'hidden',
  Deleted = 'deleted',
}

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ default: '', trim: true })
  comment: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ enum: Object.values(ReviewStatus), default: ReviewStatus.Visible })
  status: ReviewStatus;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ productId: 1 });
ReviewSchema.index({ userId: 1 });
ReviewSchema.index({ orderId: 1 });
ReviewSchema.index({ status: 1 });
ReviewSchema.index({ createdAt: -1 });
ReviewSchema.index({ userId: 1, productId: 1, orderId: 1 }, { unique: true });

ReviewSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const transformed = ret as unknown as Record<string, unknown>;
    delete transformed._id;
    return ret;
  },
});

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UploadDocument = HydratedDocument<Upload>;

export enum UploadType {
  ProductImage = 'product_image',
  Avatar = 'avatar',
  CustomDesign = 'custom_design',
  ReviewImage = 'review_image',
}

export enum UploadStatus {
  Active = 'active',
  Deleted = 'deleted',
}

@Schema({ timestamps: true })
export class Upload {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  originalName: string;

  @Prop({ required: true, trim: true })
  fileName: string;

  @Prop({ required: true, trim: true })
  mimeType: string;

  @Prop({ required: true, min: 0 })
  size: number;

  @Prop({ required: true, trim: true })
  url: string;

  @Prop({ enum: Object.values(UploadType), required: true })
  type: UploadType;

  @Prop({ enum: Object.values(UploadStatus), default: UploadStatus.Active })
  status: UploadStatus;
}

export const UploadSchema = SchemaFactory.createForClass(Upload);

UploadSchema.index({ userId: 1 });
UploadSchema.index({ type: 1 });
UploadSchema.index({ status: 1 });
UploadSchema.index({ createdAt: -1 });

UploadSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const transformed = ret as unknown as Record<string, unknown>;
    delete transformed._id;
    return ret;
  },
});

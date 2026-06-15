import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UploadDocument = HydratedDocument<Upload>;

export enum UploadType {
  ProductImage = 'product_image',
  Avatar = 'avatar',
  ReviewImage = 'review_image',
}

export enum UploadStatus {
  Pending = 'pending',
  Active = 'active',
}

export enum UploadProvider {
  Cloudinary = 'cloudinary',
}

export enum UploadTargetType {
  User = 'user',
  Product = 'product',
  Review = 'review',
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

  @Prop({
    trim: true,
    required: function (this: Upload) {
      return this.status !== UploadStatus.Pending;
    },
  })
  url: string;

  @Prop({ enum: Object.values(UploadProvider), default: UploadProvider.Cloudinary })
  provider: UploadProvider;

  @Prop({ trim: true })
  publicId?: string;

  @Prop({ trim: true })
  resourceType?: string;

  @Prop({ trim: true })
  format?: string;

  @Prop({ min: 0 })
  width?: number;

  @Prop({ min: 0 })
  height?: number;

  @Prop({ min: 0 })
  version?: number;

  @Prop({ enum: Object.values(UploadType), required: true })
  type: UploadType;

  @Prop({ enum: Object.values(UploadStatus), default: UploadStatus.Active })
  status: UploadStatus;

  @Prop({ enum: Object.values(UploadTargetType) })
  attachedToType?: UploadTargetType;

  @Prop({ type: Types.ObjectId })
  attachedToId?: Types.ObjectId;

  @Prop()
  expiresAt?: Date;
}

export const UploadSchema = SchemaFactory.createForClass(Upload);

UploadSchema.index({ userId: 1 });
UploadSchema.index({ type: 1 });
UploadSchema.index({ status: 1 });
UploadSchema.index({ publicId: 1 }, { unique: true, sparse: true });
UploadSchema.index({ attachedToType: 1, attachedToId: 1 });
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

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CustomDesignDocument = HydratedDocument<CustomDesign>;

export enum CustomDesignStatus {
  Draft = 'draft',
  Submitted = 'submitted',
  Reviewing = 'reviewing',
  Quoted = 'quoted',
  Approved = 'approved',
  Rejected = 'rejected',
  InProduction = 'in_production',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

@Schema({ timestamps: true })
export class CustomDesign {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Product' })
  productId?: Types.ObjectId;

  @Prop({ required: true, trim: true })
  designName: string;

  @Prop({ default: '', trim: true })
  note: string;

  @Prop({ default: '', trim: true })
  textContent: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Upload' }], default: [] })
  uploadedFiles: Types.ObjectId[];

  @Prop({ trim: true })
  selectedColor?: string;

  @Prop({ trim: true })
  selectedSize?: string;

  @Prop({ trim: true })
  material?: string;

  @Prop({ min: 0, default: 0 })
  estimatedPrice: number;

  @Prop({
    enum: Object.values(CustomDesignStatus),
    default: CustomDesignStatus.Submitted,
  })
  status: CustomDesignStatus;

  @Prop({ default: '', trim: true })
  adminNote: string;
}

export const CustomDesignSchema = SchemaFactory.createForClass(CustomDesign);

CustomDesignSchema.index({ userId: 1 });
CustomDesignSchema.index({ productId: 1 });
CustomDesignSchema.index({ status: 1 });
CustomDesignSchema.index({ createdAt: -1 });

CustomDesignSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const transformed = ret as unknown as Record<string, unknown>;
    delete transformed._id;
    return ret;
  },
});

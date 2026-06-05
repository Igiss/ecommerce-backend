import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReportDocument = HydratedDocument<Report>;

export enum ReportType {
  Daily = 'daily',
  Monthly = 'monthly',
  Custom = 'custom',
}

@Schema({ _id: false })
export class BestSellingProduct {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, min: 0, default: 0 })
  quantitySold: number;

  @Prop({ required: true, min: 0, default: 0 })
  revenue: number;
}

export const BestSellingProductSchema = SchemaFactory.createForClass(BestSellingProduct);

@Schema({ timestamps: true })
export class Report {
  @Prop({ enum: Object.values(ReportType), required: true })
  type: ReportType;

  @Prop({ required: true })
  fromDate: Date;

  @Prop({ required: true })
  toDate: Date;

  @Prop({ required: true, min: 0, default: 0 })
  totalUsers: number;

  @Prop({ required: true, min: 0, default: 0 })
  totalProducts: number;

  @Prop({ required: true, min: 0, default: 0 })
  totalOrders: number;

  @Prop({ required: true, min: 0, default: 0 })
  totalRevenue: number;

  @Prop({ type: [BestSellingProductSchema], default: [] })
  bestSellingProducts: BestSellingProduct[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

ReportSchema.index({ type: 1 });
ReportSchema.index({ fromDate: 1, toDate: 1 });
ReportSchema.index({ createdAt: -1 });

ReportSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const transformed = ret as unknown as Record<string, unknown>;
    delete transformed._id;
    return ret;
  },
});

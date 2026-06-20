import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { SeoData, SeoDataSchema } from './seo.schema';

export type CategoryDocument = HydratedDocument<Category>;
export type CategoryStatus = 'active' | 'inactive';

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ default: '', trim: true })
  description: string;

  @Prop({ enum: ['active', 'inactive'], default: 'active' })
  status: CategoryStatus;

  @Prop({ type: SeoDataSchema, default: {} })
  seo: SeoData;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const transformed = ret as unknown as Record<string, unknown>;
    delete transformed._id;
    return ret;
  },
});

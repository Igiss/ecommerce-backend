import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
export class SeoData {
  @Prop({ trim: true })
  metaTitle?: string;

  @Prop({ trim: true })
  metaDescription?: string;

  @Prop({ type: [String], default: [] })
  metaKeywords?: string[];

  @Prop({ trim: true })
  ogImage?: string;
}

export const SeoDataSchema = SchemaFactory.createForClass(SeoData);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SeoData, SeoDataSchema } from './seo.schema';

export type ProductDocument = HydratedDocument<Product>;

export enum ProductType {
  Standard = 'standard',
  Cup = 'cup',
  Household = 'household',
  ThreeDPrint = '3d_print',
  Custom = 'custom',
}

export enum ProductStatus {
  Active = 'active',
  Inactive = 'inactive',
  Deleted = 'deleted',
}

@Schema({ _id: false })
export class ProductDimensions {
  @Prop({ min: 0 })
  length?: number;

  @Prop({ min: 0 })
  width?: number;

  @Prop({ min: 0 })
  height?: number;

  @Prop({ default: 'cm', trim: true })
  unit?: string;
}

export const ProductDimensionsSchema = SchemaFactory.createForClass(ProductDimensions);

@Schema({ _id: false })
export class ProductCustomOptions {
  @Prop({ type: [String], default: [] })
  allowedColors?: string[];

  @Prop({ type: [String], default: [] })
  allowedSizes?: string[];

  @Prop({ type: [String], default: [] })
  allowedMaterials?: string[];

  @Prop({ default: false })
  allowText?: boolean;

  @Prop({ default: false })
  allowImageUpload?: boolean;

  @Prop({ default: false })
  allowModelUpload?: boolean;

  @Prop({ min: 0, default: 0 })
  extraPrice?: number;
}

export const ProductCustomOptionsSchema = SchemaFactory.createForClass(ProductCustomOptions);

@Schema({ _id: false })
export class ProductVariant {
  @Prop({ trim: true })
  color?: string;

  @Prop({ trim: true })
  size?: string;

  @Prop({ trim: true })
  material?: string;

  @Prop({ min: 0 })
  price?: number;

  @Prop({ min: 0, default: 0 })
  stock: number;
}

export const ProductVariantSchema = SchemaFactory.createForClass(ProductVariant);

@Schema({ timestamps: true })
export class Product {
  @Prop({ type: Number, min: 1 })
  productId?: number;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ default: '', trim: true })
  description: string;

  @Prop({
    enum: Object.values(ProductType),
    default: ProductType.Standard,
    required: true,
  })
  productType: ProductType;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ min: 0 })
  salePrice?: number;

  @Prop()
  saleStartDate?: Date;

  @Prop()
  saleEndDate?: Date;

  @Prop({ min: 0, select: false })
  costPrice?: number;

  @Prop({ required: true, min: 0, default: 0 })
  stock: number;

  @Prop({ min: 0, default: 0 })
  soldCount: number;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  categoryId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ trim: true })
  brand?: string;

  @Prop({ trim: true })
  material?: string;

  @Prop({ type: [String], default: [] })
  color: string[];

  @Prop({ type: [String], default: [] })
  size: string[];

  @Prop({ type: ProductDimensionsSchema, default: {} })
  dimensions: ProductDimensions;

  @Prop({ min: 0 })
  weight?: number;

  @Prop({ default: false })
  isCustomizable: boolean;

  @Prop({ type: ProductCustomOptionsSchema, default: {} })
  customOptions: ProductCustomOptions;

  @Prop({ type: [ProductVariantSchema], default: [] })
  variants: ProductVariant[];

  @Prop({ enum: Object.values(ProductStatus), default: ProductStatus.Active })
  status: ProductStatus;

  @Prop()
  deletedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: SeoDataSchema, default: {} })
  seo: SeoData;

  @Prop({ type: [Number], select: false })
  embedding?: number[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ name: 'text', description: 'text', brand: 'text' });
ProductSchema.index({ productId: 1 }, { unique: true, sparse: true });
ProductSchema.index({ productType: 1 });
ProductSchema.index({ categoryId: 1 });
ProductSchema.index({ status: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ createdBy: 1 });
ProductSchema.index({ soldCount: -1 });

ProductSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    const transformed = ret as unknown as Record<string, unknown>;
    transformed.id = transformed.productId;
    delete transformed._id;
    delete transformed.productId;
    delete transformed.costPrice;
    return ret;
  },
});

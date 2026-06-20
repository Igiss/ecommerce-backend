import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus, ProductType } from '../../database/schemas/product.schema';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductVariantDto {
  @ApiPropertyOptional({ example: 'white' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ example: '350ml' })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({ example: 'ceramic' })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional({ example: 150000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ example: 20, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Cốc sứ trắng' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'coc-su-trang', description: 'Tự tạo từ name nếu bỏ trống' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'Cốc sứ cao cấp dung tích 350ml' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 150000, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 120000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  saleStartDate?: Date;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  saleEndDate?: Date;

  @ApiPropertyOptional({ example: 80000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({ description: 'MongoDB ObjectId của danh mục' })
  @IsMongoId()
  categoryId: string;

  @ApiPropertyOptional({
    type: [String],
    maxItems: 10,
    example: ['665f08d2de3f6c0cb82a4581'],
    description:
      'Tối đa 10 Upload ID loại `product_image` đã hoàn tất. Upload phải thuộc Admin/Owner đang tạo hoặc cập nhật sản phẩm; không gửi URL Cloudinary trực tiếp.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsMongoId({ each: true })
  imageUploadIds?: string[];

  @ApiPropertyOptional({ example: 'Cup Store' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ enum: ProductType })
  @IsOptional()
  @IsIn(Object.values(ProductType))
  productType?: ProductType;

  @ApiPropertyOptional({ example: 'Sứ' })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional({ type: [String], example: ['trắng', 'đen'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  color?: string[];

  @ApiPropertyOptional({ type: [String], example: ['350ml', '500ml'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  size?: string[];

  @ApiPropertyOptional({ type: [ProductVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  @ApiPropertyOptional({ enum: [ProductStatus.Active, ProductStatus.Inactive] })
  @IsOptional()
  @IsIn([ProductStatus.Active, ProductStatus.Inactive])
  status?: ProductStatus.Active | ProductStatus.Inactive;
}

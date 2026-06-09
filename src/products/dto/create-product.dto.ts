import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus, ProductType } from '../../database/schemas/product.schema';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
  @ApiProperty({ example: 50, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiProperty({ description: 'MongoDB ObjectId của danh mục' })
  @IsMongoId()
  categoryId: string;

  @ApiPropertyOptional({ type: [String], maxItems: 10, example: ['https://example.com/cup.jpg'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  images?: string[];

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

  @ApiPropertyOptional({ enum: [ProductStatus.Active, ProductStatus.Inactive] })
  @IsOptional()
  @IsIn([ProductStatus.Active, ProductStatus.Inactive])
  status?: ProductStatus.Active | ProductStatus.Inactive;
}

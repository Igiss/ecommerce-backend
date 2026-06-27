import { Type } from 'class-transformer';
import { IsIn, IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus, ProductType } from '../../database/schemas/product.schema';

export class ProductQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1, description: 'Trang hiện tại' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    default: 10,
    description: 'Số sản phẩm trên mỗi trang',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Tìm theo tên hoặc nội dung sản phẩm' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'MongoDB ObjectId của danh mục' })
  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'MongoDB ObjectId của chủ shop / người tạo' })
  @IsOptional()
  @IsMongoId()
  ownerId?: string;


  @ApiPropertyOptional({ minimum: 0, description: 'Giá thấp nhất' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ minimum: 0, description: 'Giá cao nhất' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Lọc theo thương hiệu' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ enum: ProductType, description: 'Loại sản phẩm' })
  @IsOptional()
  @IsIn(Object.values(ProductType))
  productType?: ProductType;

  @ApiPropertyOptional({ enum: ProductStatus, description: 'Trạng thái sản phẩm' })
  @IsOptional()
  @IsIn(Object.values(ProductStatus))
  status?: ProductStatus;

  @ApiPropertyOptional({ enum: ['price', 'createdAt'], default: 'createdAt' })
  @IsOptional()
  @IsIn(['price', 'createdAt'])
  sortBy?: 'price' | 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

import { IsArray, IsMongoId, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 1, minimum: 1, description: 'ID số của sản phẩm' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  productId: number;

  @ApiProperty({ description: 'MongoDB ObjectId của đơn hàng' })
  @IsMongoId()
  orderId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Sản phẩm đẹp, đóng gói cẩn thận' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({ type: [String], example: ['https://example.com/review.jpg'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}

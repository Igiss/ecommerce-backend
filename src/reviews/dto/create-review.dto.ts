import {
  ArrayMaxSize,
  IsArray,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'MongoDB ObjectId của sản phẩm' })
  @IsMongoId()
  productId: string;

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

  @ApiPropertyOptional({
    type: [String],
    maxItems: 5,
    example: ['665f08d2de3f6c0cb82a4581'],
    description:
      'Tối đa 5 Upload ID loại `review_image` đã hoàn tất và thuộc user đang tạo review; không gửi URL trực tiếp.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsMongoId({ each: true })
  imageUploadIds?: string[];
}

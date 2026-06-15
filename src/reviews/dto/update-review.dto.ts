import { Type } from 'class-transformer';
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
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateReviewDto {
  @ApiPropertyOptional({ example: 4, minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ example: 'Cập nhật nội dung đánh giá' })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiPropertyOptional({
    type: [String],
    maxItems: 5,
    example: ['665f08d2de3f6c0cb82a4581'],
    description:
      'Danh sách ảnh thay thế, gồm tối đa 5 Upload ID loại `review_image` thuộc chính chủ review.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsMongoId({ each: true })
  imageUploadIds?: string[];
}

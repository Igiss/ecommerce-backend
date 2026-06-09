import { Type } from 'class-transformer';
import { IsMongoId, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddCartItemDto {
  @ApiProperty({ example: 1, minimum: 1, description: 'ID số của sản phẩm' })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  productId: number;

  @ApiPropertyOptional({ description: 'MongoDB ObjectId của bản thiết kế tùy chỉnh' })
  @IsOptional()
  @IsMongoId()
  customDesignId?: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;
}

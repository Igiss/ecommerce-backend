import { Type } from 'class-transformer';
import { IsMongoId, IsNumber, IsOptional, Min } from 'class-validator';

export class AddCartItemDto {
  @IsMongoId()
  productId: string;

  @IsOptional()
  @IsMongoId()
  customDesignId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;
}

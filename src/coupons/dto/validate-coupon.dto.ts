import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CouponCartItemDto {
  @ApiProperty({ example: '6a3615f4fb0b2cccc9997a0c' })
  @Type(() => String)
  @IsString()
  productId: string;

  @ApiPropertyOptional({ example: '6a2f70a452b2bae0ba23fdfe' })
  @IsOptional()
  @Type(() => String)
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional({ example: '6a2f70a452b2bae0ba23fdff' })
  @IsOptional()
  @Type(() => String)
  @IsString()
  categoryId?: string;

  @ApiProperty({ example: 200000, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  total: number;
}

export class ValidateCouponDto {
  @ApiProperty({ example: 'SALE10' })
  @IsString()
  code: string;

  @ApiProperty({ example: 500000, minimum: 0, description: 'Tổng tiền đơn hàng trước giảm giá' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  orderTotal: number;

  @ApiPropertyOptional({ type: [CouponCartItemDto], description: 'Danh sách sản phẩm trong giỏ hàng để lọc theo shop/danh mục' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CouponCartItemDto)
  items?: CouponCartItemDto[];
}

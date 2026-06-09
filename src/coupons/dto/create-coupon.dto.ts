import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '../../database/schemas/coupon.schema';

export class CreateCouponDto {
  @ApiProperty({ example: 'SALE10', description: 'Mã giảm giá, tự động chuyển thành chữ in hoa' })
  @IsString()
  code: string;

  @ApiProperty({ enum: DiscountType, example: DiscountType.Percentage })
  @IsEnum(DiscountType)
  discountType: DiscountType;

  @ApiProperty({
    example: 10,
    minimum: 0,
    description: 'Phần trăm giảm hoặc số tiền giảm, tùy discountType',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountAmount: number;

  @ApiPropertyOptional({ example: 200000, minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minOrderValue?: number;

  @ApiPropertyOptional({
    example: 50000,
    minimum: 0,
    description: 'Số tiền giảm tối đa, thường dùng với giảm theo phần trăm',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @ApiProperty({ example: '2026-12-31T23:59:59.000Z', type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  expiryDate: Date;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 100, minimum: 1, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  usageLimit?: number;
}

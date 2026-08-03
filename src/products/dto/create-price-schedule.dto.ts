import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import {
  DiscountValueType,
  PriceAdjustmentType,
} from '../../database/schemas/product-price-schedule.schema';

export class CreatePriceScheduleDto {
  @ApiProperty({ description: 'ID MongoDB hoặc ID số (productId) của sản phẩm' })
  @IsString()
  productId: string;

  @ApiProperty({ enum: PriceAdjustmentType, example: PriceAdjustmentType.SALE_CAMPAIGN })
  @IsEnum(PriceAdjustmentType)
  type: PriceAdjustmentType;

  @ApiPropertyOptional({ enum: DiscountValueType, default: DiscountValueType.FIXED_PRICE })
  @IsOptional()
  @IsEnum(DiscountValueType)
  valueType?: DiscountValueType;

  @ApiProperty({ example: 120000, description: 'Giá mới, % giảm hoặc số tiền giảm', minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({ example: '2026-08-04T00:00:00Z', description: 'Ngày/giờ bắt đầu áp dụng' })
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiPropertyOptional({
    example: '2026-08-10T23:59:59Z',
    description: 'Ngày/giờ kết thúc (bắt buộc cho sale_campaign)',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({
    example: 'Flash Sale Tháng 8',
    description: 'Tên chương trình hoặc ghi chú lý do đổi giá',
  })
  @IsOptional()
  @IsString()
  title?: string;
}

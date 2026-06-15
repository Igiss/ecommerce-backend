import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../database/schemas/order.schema';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, description: 'ID số của sản phẩm' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  productId?: number;

  @ApiPropertyOptional({ description: 'MongoDB ObjectId của thiết kế tùy chỉnh' })
  @IsOptional()
  @IsMongoId()
  customDesignId?: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class ShippingAddressDto {
  @ApiProperty({ example: 'Nguyễn Văn An' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: '0912345678' })
  @IsString()
  phone: string;

  @ApiProperty({ example: '12 Nguyễn Huệ' })
  @IsString()
  address: string;

  @ApiProperty({
    example: 'Phường Sài Gòn',
    description: 'Xã, phường hoặc đặc khu theo đơn vị hành chính mới',
  })
  @IsString()
  ward: string;

  @ApiProperty({
    example: 'TP. Hồ Chí Minh',
    description: 'Tỉnh hoặc thành phố trực thuộc trung ương',
  })
  @IsString()
  province: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty({ type: ShippingAddressDto })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: 'SALE10' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ example: 'Giao hàng giờ hành chính' })
  @IsOptional()
  @IsString()
  note?: string;
}

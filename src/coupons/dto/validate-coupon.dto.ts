import { Type } from 'class-transformer';
import { IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateCouponDto {
  @ApiProperty({ example: 'SALE10' })
  @IsString()
  code: string;

  @ApiProperty({ example: 500000, minimum: 0, description: 'Tổng tiền đơn hàng trước giảm giá' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  orderTotal: number;
}

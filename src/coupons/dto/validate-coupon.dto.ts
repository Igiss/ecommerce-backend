import { Type } from 'class-transformer';
import { IsNumber, IsString, Min } from 'class-validator';

export class ValidateCouponDto {
  @IsString()
  code: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  orderTotal: number;
}


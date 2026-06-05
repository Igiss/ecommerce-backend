import { Type } from 'class-transformer';
import { IsEnum, IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { PaymentMethod } from '../../database/schemas/order.schema';

export class CreatePaymentDto {
  @IsMongoId()
  orderId: string;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  transactionCode?: string;
}

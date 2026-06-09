import { Type } from 'class-transformer';
import { IsEnum, IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { PaymentMethod } from '../../database/schemas/order.schema';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ description: 'MongoDB ObjectId của đơn hàng' })
  @IsMongoId()
  orderId: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ example: 500000, minimum: 0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ example: 'TXN-20260609-001' })
  @IsOptional()
  @IsString()
  transactionCode?: string;
}

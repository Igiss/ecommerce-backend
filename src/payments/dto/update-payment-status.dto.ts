import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePaymentStatusDto {
  @ApiProperty({ enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @ApiPropertyOptional({ example: 'TXN-20260609-001' })
  @IsOptional()
  @IsString()
  transactionCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  providerTransactionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  failureReason?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  refundAmount?: number;
}

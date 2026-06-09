import { IsEnum, IsOptional, IsString } from 'class-validator';
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
}

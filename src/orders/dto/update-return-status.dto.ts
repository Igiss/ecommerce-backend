import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ReturnStatus } from '../../database/schemas/order.schema';

export class UpdateReturnStatusDto {
  @ApiProperty({ enum: [ReturnStatus.Approved, ReturnStatus.Rejected, ReturnStatus.Returned] })
  @IsEnum(ReturnStatus)
  @IsNotEmpty()
  returnStatus: ReturnStatus;
}

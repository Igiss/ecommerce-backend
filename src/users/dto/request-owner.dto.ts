import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsVietnamPhone } from '../../common/decorators/is-vietnam-phone.decorator';

export class RequestOwnerDto {
  @ApiProperty({ example: 'Cốc Xinh Store' })
  @IsString()
  @IsNotEmpty()
  storeName: string;

  @ApiProperty({ example: '0901234567' })
  @IsNotEmpty()
  @IsVietnamPhone()
  storePhone: string;

  @ApiProperty({ example: '123 Đường ABC, Quận 1, TP.HCM' })
  @IsString()
  @IsNotEmpty()
  storeAddress: string;
}

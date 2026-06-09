import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CancelOrderDto {
  @ApiPropertyOptional({ example: 'Tôi muốn thay đổi sản phẩm' })
  @IsOptional()
  @IsString()
  cancelReason?: string;
}

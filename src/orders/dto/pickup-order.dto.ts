import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class PickupOrderDto {
  @ApiProperty({
    example: 'GHN',
    description: 'Tên đơn vị vận chuyển/hãng ship',
  })
  @IsString()
  shippingProvider: string;

  @ApiPropertyOptional({
    example: 'GHN123456789',
    description: 'Mã vận đơn để khách tra cứu',
  })
  @IsOptional()
  @IsString()
  trackingCode?: string;
}

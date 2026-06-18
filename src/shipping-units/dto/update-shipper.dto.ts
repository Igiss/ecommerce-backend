import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { IsVietnamPhone } from '../../common/decorators/is-vietnam-phone.decorator';

export class UpdateShipperDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn Tài' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsVietnamPhone()
  phone?: string;

  @ApiPropertyOptional({ example: '12 Nguyễn Huệ, Quận 1, TP.HCM' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Xe máy', description: 'Loại phương tiện' })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiPropertyOptional({ example: '59P1-12345', description: 'Biển số xe' })
  @IsOptional()
  @IsString()
  licensePlate?: string;

  @ApiPropertyOptional({
    example: 'Phường Bến Nghé',
    description: 'Phường/xã mà shipper phụ trách giao hàng',
  })
  @IsOptional()
  @IsString()
  coverageWard?: string;
}

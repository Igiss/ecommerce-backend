import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IsVietnamPhone } from '../../common/decorators/is-vietnam-phone.decorator';

class ShipperCoverageAreaDto {
  @ApiProperty({ example: 'TP. Hồ Chí Minh' })
  @IsString()
  province: string;

  @ApiProperty({ example: 'Phường Bến Nghé' })
  @IsString()
  ward: string;
}

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
    example: { province: 'TP. Hồ Chí Minh', ward: 'Phường Bến Nghé' },
    description: 'Khu vực mà shipper phụ trách giao hàng',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShipperCoverageAreaDto)
  coverageArea?: ShipperCoverageAreaDto;
}

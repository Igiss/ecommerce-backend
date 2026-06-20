import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
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

export class CreateShipperDto {
  @ApiProperty({ example: 'Nguyễn Văn Tài' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'shipper01@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsVietnamPhone()
  phone?: string;

  @ApiPropertyOptional({ example: 'Xe máy' })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiPropertyOptional({ example: '59P1-12345' })
  @IsOptional()
  @IsString()
  licensePlate?: string;

  @ApiPropertyOptional({ example: '12 Nguyễn Huệ, Quận 1, TP.HCM' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: { province: 'TP. Hồ Chí Minh', ward: 'Phường Bến Nghé' },
    description: 'Khu vực mà shipper phụ trách giao hàng',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShipperCoverageAreaDto)
  coverageArea?: ShipperCoverageAreaDto;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { IsVietnamPhone } from '../../common/decorators/is-vietnam-phone.decorator';

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
    example: 'Phường Bến Nghé',
    description: 'Phường/xã mà shipper phụ trách giao hàng',
  })
  @IsOptional()
  @IsString()
  coverageWard?: string;
}

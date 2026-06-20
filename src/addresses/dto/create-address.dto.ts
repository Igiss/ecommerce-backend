import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { IsVietnamPhone } from '../../common/decorators/is-vietnam-phone.decorator';

export class CreateAddressDto {
  @ApiProperty({ example: 'Nhà riêng' })
  @IsString()
  label: string;

  @ApiProperty({ example: 'Nguyễn Văn An' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: '0912345678' })
  @IsVietnamPhone()
  phone: string;

  @ApiProperty({ example: '12 Nguyễn Huệ' })
  @IsString()
  addressLine: string;

  @ApiProperty({
    example: 'Phường Bến Nghé',
    description: 'Xã, phường hoặc đặc khu theo đơn vị hành chính mới',
  })
  @IsString()
  ward: string;

  @ApiProperty({
    example: 'TP. Hồ Chí Minh',
    description: 'Tỉnh hoặc thành phố trực thuộc trung ương',
  })
  @IsString()
  province: string;

  @ApiPropertyOptional({ example: '700000' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

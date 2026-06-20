import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RegisterDto } from './register.dto';

class ShippingUnitCoverageAreaDto {
  @ApiProperty({ example: 'TP. Hồ Chí Minh' })
  @IsString()
  province: string;

  @ApiProperty({ example: 'Phường Bến Nghé' })
  @IsString()
  ward: string;
}

export class RegisterShippingUnitDto extends RegisterDto {
  @ApiProperty({ example: 'shipping_unit@example.com' })
  declare email: string;

  @ApiProperty({ example: 'Công ty Vận Chuyển GHTK' })
  @IsString()
  @MinLength(2)
  companyName: string;

  @ApiPropertyOptional({
    example: [{ province: 'TP. Hồ Chí Minh', ward: 'Phường Bến Nghé' }],
    description: 'Danh sách khu vực mà đơn vị phụ trách giao hàng',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShippingUnitCoverageAreaDto)
  coverageAreas?: ShippingUnitCoverageAreaDto[];

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ example: '123 Nguyễn Văn Linh, Q7, TP.HCM' })
  @IsOptional()
  @IsString()
  address?: string;
}

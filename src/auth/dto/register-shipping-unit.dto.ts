import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';
import { RegisterDto } from './register.dto';

export class RegisterShippingUnitDto extends RegisterDto {
  @ApiProperty({ example: 'shipping_unit@example.com' })
  declare email: string;

  @ApiProperty({ example: 'Công ty Vận Chuyển GHTK' })
  @IsString()
  @MinLength(2)
  companyName: string;

  @ApiPropertyOptional({
    example: ['Phường Bến Nghé', 'Phường Bến Thành'],
    description: 'Danh sách phường/xã mà đơn vị phụ trách giao hàng',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  coverageWards?: string[];

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ example: '123 Nguyễn Văn Linh, Q7, TP.HCM' })
  @IsOptional()
  @IsString()
  address?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdateCoverageDto {
  @ApiProperty({
    example: ['Phường Bến Nghé', 'Phường Bến Thành', 'Phường Cầu Kho'],
    description: 'Danh sách phường/xã mà đơn vị này phụ trách giao hàng',
  })
  @IsArray()
  @IsString({ each: true })
  coverageWards: string[];
}

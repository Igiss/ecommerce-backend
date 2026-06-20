import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CoverageAreaDto {
  @ApiProperty({ example: 'TP. Hồ Chí Minh' })
  @IsString()
  province: string;

  @ApiProperty({ example: 'Phường Bến Nghé' })
  @IsString()
  ward: string;
}

export class UpdateCoverageDto {
  @ApiProperty({
    example: [{ province: 'TP. Hồ Chí Minh', ward: 'Phường Bến Nghé' }],
    description: 'Danh sách khu vực phụ trách',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoverageAreaDto)
  coverageAreas: CoverageAreaDto[];
}

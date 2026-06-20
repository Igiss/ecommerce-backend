import { IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryStatus } from '../../database/schemas/category.schema';
import { SeoDataDto } from '../../common/dto/seo.dto';
export class CreateCategoryDto {
  @ApiProperty({ example: 'Cốc sứ' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'coc-su', description: 'Tự tạo từ name nếu bỏ trống' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'Các sản phẩm cốc làm từ sứ' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive'], default: 'active' })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: CategoryStatus;

  @ApiPropertyOptional({ type: () => SeoDataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoDataDto)
  seo?: SeoDataDto;
}

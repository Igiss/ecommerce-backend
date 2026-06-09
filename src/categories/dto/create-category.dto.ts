import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryStatus } from '../../database/schemas/category.schema';

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
}

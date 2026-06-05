import { IsIn, IsOptional, IsString } from 'class-validator';
import { CategoryStatus } from '../../database/schemas/category.schema';

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: CategoryStatus;
}

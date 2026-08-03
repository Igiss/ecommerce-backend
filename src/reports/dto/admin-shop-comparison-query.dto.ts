import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ReportDateQueryDto } from './report-date-query.dto';

export class AdminShopComparisonQueryDto extends ReportDateQueryDto {
  @ApiPropertyOptional({ enum: ['7days', '30days', '12months'], default: '30days' })
  @IsOptional()
  @IsIn(['7days', '30days', '12months'])
  period?: '7days' | '30days' | '12months';

  @ApiPropertyOptional({
    enum: ['totalItemsSold', 'totalRevenue', 'totalOrders', 'completionRate', 'totalProducts'],
    default: 'totalItemsSold',
  })
  @IsOptional()
  @IsIn(['totalItemsSold', 'totalRevenue', 'totalOrders', 'completionRate', 'totalProducts'])
  sortBy?: 'totalItemsSold' | 'totalRevenue' | 'totalOrders' | 'completionRate' | 'totalProducts';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by shop/store name or email' })
  @IsOptional()
  @IsString()
  search?: string;
}

import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RevenueQueryDto {
  @ApiPropertyOptional({ enum: ['7days', '30days', '12months'], default: '7days' })
  @IsOptional()
  @IsIn(['7days', '30days', '12months'])
  period?: '7days' | '30days' | '12months';
}

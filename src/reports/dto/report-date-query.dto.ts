import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class ReportDateQueryDto {
  @ApiPropertyOptional({
    example: '2026-01-01',
    description: 'Include orders created from this ISO date or datetime',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-01-31',
    description: 'Include orders created through this ISO date or datetime',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}

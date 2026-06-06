import { IsIn, IsOptional } from 'class-validator';

export class RevenueQueryDto {
  @IsOptional()
  @IsIn(['7days', '30days', '12months'])
  period?: '7days' | '30days' | '12months';
}


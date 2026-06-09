import { Type } from 'class-transformer';
import { IsArray, IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomDesignDto {
  @ApiPropertyOptional({ example: 1, minimum: 1, description: 'ID số của sản phẩm nền' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  productId?: number;

  @ApiProperty({ example: 'Cốc in logo công ty' })
  @IsString()
  designName: string;

  @ApiPropertyOptional({ example: 'In logo ở hai mặt cốc' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: 'HAPPY NEW YEAR' })
  @IsOptional()
  @IsString()
  textContent?: string;

  @ApiPropertyOptional({ type: [String], description: 'Danh sách ObjectId file đã upload' })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  uploadedFiles?: string[];

  @ApiPropertyOptional({ example: 'trắng' })
  @IsOptional()
  @IsString()
  selectedColor?: string;

  @ApiPropertyOptional({ example: '350ml' })
  @IsOptional()
  @IsString()
  selectedSize?: string;

  @ApiPropertyOptional({ example: 'Sứ' })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional({ example: 250000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedPrice?: number;
}

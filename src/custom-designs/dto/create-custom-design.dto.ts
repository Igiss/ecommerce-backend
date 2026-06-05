import { Type } from 'class-transformer';
import { IsArray, IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCustomDesignDto {
  @IsOptional()
  @IsMongoId()
  productId?: string;

  @IsString()
  designName: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  textContent?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  uploadedFiles?: string[];

  @IsOptional()
  @IsString()
  selectedColor?: string;

  @IsOptional()
  @IsString()
  selectedSize?: string;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedPrice?: number;
}

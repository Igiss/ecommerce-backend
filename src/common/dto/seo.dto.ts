import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class SeoDataDto {
  @ApiPropertyOptional({ example: 'Áo Thun Nam Cao Cấp' })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ example: 'Áo thun nam chất liệu cotton 100%, thoáng mát, thấm hút mồ hôi tốt.' })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ example: ['áo thun', 'áo nam', 'cotton'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metaKeywords?: string[];

  @ApiPropertyOptional({ example: 'https://example.com/images/ao-thun-og.jpg' })
  @IsOptional()
  @IsString()
  ogImage?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RequestReturnDto {
  @ApiProperty({ description: 'Lý do đổi trả' })
  @IsString()
  @IsNotEmpty()
  returnReason: string;

  @ApiPropertyOptional({ description: 'Hình ảnh chứng minh' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  returnImages?: string[];
}

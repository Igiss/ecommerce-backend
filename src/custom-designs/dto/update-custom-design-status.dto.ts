import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomDesignStatus } from '../../database/schemas/custom-design.schema';

export class UpdateCustomDesignStatusDto {
  @ApiProperty({ enum: CustomDesignStatus })
  @IsEnum(CustomDesignStatus)
  status: CustomDesignStatus;

  @ApiPropertyOptional({ example: 'Thiết kế đã được duyệt' })
  @IsOptional()
  @IsString()
  adminNote?: string;
}

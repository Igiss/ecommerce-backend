import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiProperty({ example: 3, minimum: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;
}

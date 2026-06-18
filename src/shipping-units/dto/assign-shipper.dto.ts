import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class AssignShipperDto {
  @ApiProperty({ description: 'MongoDB ObjectId của Shipper thuộc đơn vị này' })
  @IsMongoId()
  shipperId: string;
}

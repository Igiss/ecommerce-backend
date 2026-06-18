import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class AssignUnitDto {
  @ApiProperty({
    description: 'MongoDB ObjectId của User (ShippingUnit) cần gán cho đơn hàng',
    example: '6657a1b2c3d4e5f6a7b8c9d0',
  })
  @IsMongoId()
  shippingUnitId: string;
}

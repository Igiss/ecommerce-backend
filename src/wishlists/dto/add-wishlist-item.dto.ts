import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class AddWishlistItemDto {
  @ApiProperty({ description: 'MongoDB ObjectId của sản phẩm' })
  @IsMongoId()
  productId: string;
}

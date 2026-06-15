import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsInt, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UploadType } from '../../database/schemas/upload.schema';

const SIGNED_UPLOAD_TYPES = [
  UploadType.Avatar,
  UploadType.ProductImage,
  UploadType.ReviewImage,
] as const;

export class CreateUploadSignatureDto {
  @ApiProperty({
    enum: SIGNED_UPLOAD_TYPES,
    example: UploadType.ProductImage,
    description:
      '`product_image`: Admin/Owner; `review_image`: User; `avatar`: tài khoản đang đăng nhập.',
  })
  @IsEnum(UploadType)
  @IsIn(SIGNED_UPLOAD_TYPES)
  type: UploadType.Avatar | UploadType.ProductImage | UploadType.ReviewImage;

  @ApiProperty({
    example: 'cup.jpg',
    description: 'Tên file gốc, chỉ dùng làm metadata; backend tự tạo Cloudinary public_id.',
  })
  @IsString()
  originalName: string;

  @ApiProperty({
    enum: ['image/jpeg', 'image/png', 'image/webp'],
    example: 'image/jpeg',
  })
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  mimeType: string;

  @ApiProperty({
    example: 245760,
    minimum: 1,
    description: 'Kích thước file theo byte. Backend kiểm tra lại bằng metadata Cloudinary.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size: number;
}

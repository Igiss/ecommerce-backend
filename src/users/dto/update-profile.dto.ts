import { IsMongoId, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsVietnamPhone } from '../../common/decorators/is-vietnam-phone.decorator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn An' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: '0912345678' })
  @IsOptional()
  @IsVietnamPhone()
  phone?: string;

  @ApiPropertyOptional({
    example: '665f08d2de3f6c0cb82a4581',
    description:
      'Upload ID loại `avatar` đã hoàn tất và thuộc user đang đăng nhập; không gửi URL trực tiếp.',
  })
  @IsOptional()
  @IsMongoId()
  avatarUploadId?: string;

  @ApiPropertyOptional({ example: '12 Nguyễn Huệ, TP.HCM' })
  @IsOptional()
  @IsString()
  address?: string;
}

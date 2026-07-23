import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateBannerDto {
  @ApiProperty({ description: 'URL ảnh nổi chính (Foreground 3D Image)' })
  @IsString()
  @IsNotEmpty()
  imageUrl: string;

  @ApiProperty({ description: 'URL ảnh nền full-bleed (Background Layer Image)', required: false })
  @IsString()
  @IsOptional()
  bgImageUrl?: string;

  @ApiProperty({ description: 'Huy hiệu Badge (VD: Khuyến mãi, Nổi bật)', required: false })
  @IsString()
  @IsOptional()
  badge?: string;

  @ApiProperty({ description: 'Tiêu đề Banner', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: 'Mô tả ngắn', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Đường dẫn liên kết khi click', required: false })
  @IsString()
  @IsOptional()
  linkUrl?: string;

  @ApiProperty({ description: 'Dòng cam kết 1', required: false })
  @IsString()
  @IsOptional()
  tagline1?: string;

  @ApiProperty({ description: 'Dòng cam kết 2', required: false })
  @IsString()
  @IsOptional()
  tagline2?: string;

  @ApiProperty({ description: 'Thứ tự sắp xếp', default: 0, required: false })
  @IsNumber()
  @IsOptional()
  position?: number;

  @ApiProperty({ description: 'Trạng thái hiển thị', default: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateBannerDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  bgImageUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  badge?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  linkUrl?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  tagline1?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  tagline2?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  position?: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

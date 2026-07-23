import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BannerDocument = Banner & Document;

@Schema({ timestamps: true })
export class Banner {
  @Prop({ required: true })
  imageUrl: string; // Ảnh lớp nổi 3D (Foreground Image)

  @Prop({ default: '' })
  bgImageUrl: string; // Ảnh lớp nền full màn hình (Background Image)

  @Prop({ default: '' })
  badge: string; // Badge nhãn (VD: Khuyến mãi, Bán chạy)

  @Prop({ default: '' })
  title: string; // Tiêu đề chính của Banner

  @Prop({ default: '' })
  description: string; // Mô tả ngắn

  @Prop({ default: '' })
  linkUrl: string; // Đường dẫn liên kết khi nhấp

  @Prop({ default: '' })
  tagline1: string; // Dòng cam kết 1 (VD: ✔ Giao hàng nhanh)

  @Prop({ default: '' })
  tagline2: string; // Dòng cam kết 2 (VD: ✔ Đổi trả 7 ngày)

  @Prop({ default: 0 })
  position: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const BannerSchema = SchemaFactory.createForClass(Banner);

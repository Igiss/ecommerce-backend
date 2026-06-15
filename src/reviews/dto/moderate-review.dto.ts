import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ReviewStatus } from '../../database/schemas/review.schema';

export class ModerateReviewDto {
  @ApiProperty({ enum: [ReviewStatus.Visible, ReviewStatus.Hidden] })
  @IsEnum(ReviewStatus)
  status: ReviewStatus.Visible | ReviewStatus.Hidden;

  @ApiPropertyOptional({ example: 'Nội dung vi phạm tiêu chuẩn cộng đồng' })
  @IsOptional()
  @IsString()
  moderationReason?: string;
}

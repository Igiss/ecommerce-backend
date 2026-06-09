import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatMessageDto {
  @ApiProperty({ enum: ['user', 'assistant'], example: 'user' })
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @ApiProperty({ example: 'Có cốc nào dưới 200.000 đồng không?' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ChatDto {
  @ApiPropertyOptional({
    description: 'Tin nhắn đơn giản. Có thể dùng thay cho messages.',
    example: 'Có cốc nào dưới 200.000 đồng không?',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  message?: string;

  @ApiPropertyOptional({
    type: [ChatMessageDto],
    description: 'Lịch sử hội thoại. Có thể dùng thay cho message.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages?: ChatMessageDto[];
}

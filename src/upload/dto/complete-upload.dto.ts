import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class CompleteUploadDto {
  @ApiProperty({
    example: '665f08d2de3f6c0cb82a4581',
    description:
      'Upload ID trả về từ `POST /upload/signature`. Upload phải thuộc user đang đăng nhập.',
  })
  @IsMongoId()
  uploadId: string;
}

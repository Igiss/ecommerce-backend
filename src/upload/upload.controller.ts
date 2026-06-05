import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UploadType } from '../database/schemas/upload.schema';
import { UploadService } from './upload.service';

function storage(folder: string) {
  return diskStorage({
    destination: `uploads/${folder}`,
    filename: (_req, file, callback) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
      callback(null, uniqueName);
    },
  });
}

@ApiTags('Upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('product-image')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '[Admin/Staff] Upload ảnh sản phẩm, trả URL ảnh local' })
  @UseInterceptors(FileInterceptor('file', { storage: storage('products') }))
  uploadProductImage(@CurrentUser() user: JwtPayload, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.uploadService.saveFile(user.sub, file, UploadType.ProductImage);
  }

  @Post('avatar')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '[User] Upload avatar, trả URL ảnh local' })
  @UseInterceptors(FileInterceptor('file', { storage: storage('avatars') }))
  uploadAvatar(@CurrentUser() user: JwtPayload, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.uploadService.saveFile(user.sub, file, UploadType.Avatar);
  }

  @Post('custom-design')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '[User] Upload ảnh/file mẫu cho yêu cầu custom' })
  @UseInterceptors(FileInterceptor('file', { storage: storage('custom-designs') }))
  uploadCustomDesign(@CurrentUser() user: JwtPayload, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.uploadService.saveFile(user.sub, file, UploadType.CustomDesign);
  }
}

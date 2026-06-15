import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Upload, UploadSchema } from '../database/schemas/upload.schema';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { CloudinaryService } from './cloudinary.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Upload.name, schema: UploadSchema }])],
  controllers: [UploadController],
  providers: [UploadService, CloudinaryService],
  exports: [UploadService],
})
export class UploadModule {}

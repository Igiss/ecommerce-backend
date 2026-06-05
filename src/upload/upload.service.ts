import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Upload, UploadDocument, UploadType } from '../database/schemas/upload.schema';

interface UploadedFile {
  originalname: string;
  filename: string;
  mimetype: string;
  size: number;
}

@Injectable()
export class UploadService {
  constructor(@InjectModel(Upload.name) private readonly uploadModel: Model<UploadDocument>) {}

  async saveFile(userId: string, file: UploadedFile, type: UploadType) {
    const url = `/uploads/${file.filename}`;

    return this.uploadModel.create({
      userId: new Types.ObjectId(userId),
      originalName: file.originalname,
      fileName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      url,
      type,
    });
  }
}

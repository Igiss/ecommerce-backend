import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { Role } from '../common/enums/role.enum';
import {
  Upload,
  UploadDocument,
  UploadProvider,
  UploadStatus,
  UploadTargetType,
  UploadType,
} from '../database/schemas/upload.schema';
import { CloudinaryService } from './cloudinary.service';
import { CreateUploadSignatureDto } from './dto/create-upload-signature.dto';

@Injectable()
export class UploadService {
  constructor(
    @InjectModel(Upload.name) private readonly uploadModel: Model<UploadDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async createSignature(
    userId: string,
    role: Role,
    dto: CreateUploadSignatureDto,
  ) {
    this.assertCanUpload(role, dto.type);
    this.assertFileSize(dto.type, dto.size);

    const publicId = `ecommerce/${this.folderFor(dto.type)}/${userId}/${randomUUID()}`;
    const upload = await this.uploadModel.create({
      userId: new Types.ObjectId(userId),
      originalName: dto.originalName,
      fileName: publicId.split('/').at(-1) || publicId,
      mimeType: dto.mimeType,
      size: dto.size,
      url: '',
      provider: UploadProvider.Cloudinary,
      publicId,
      resourceType: 'image',
      type: dto.type,
      status: UploadStatus.Pending,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    return {
      uploadId: upload.id,
      ...this.cloudinaryService.createUploadSignature(publicId),
    };
  }

  async completeUpload(userId: string, uploadId: string) {
    const upload = await this.uploadModel
      .findOne({
        _id: new Types.ObjectId(uploadId),
        userId: new Types.ObjectId(userId),
        provider: UploadProvider.Cloudinary,
      })
      .exec();

    if (!upload) {
      throw new NotFoundException('Upload not found');
    }
    if (upload.status === UploadStatus.Active) {
      return upload;
    }
    if (upload.status !== UploadStatus.Pending || !upload.publicId) {
      throw new BadRequestException('Upload cannot be completed');
    }
    if (upload.expiresAt && upload.expiresAt <= new Date()) {
      throw new BadRequestException('Upload signature has expired');
    }

    let resource;
    try {
      resource = await this.cloudinaryService.getImageResource(upload.publicId);
    } catch {
      throw new BadRequestException('Cloudinary upload was not found');
    }

    if (resource.publicId !== upload.publicId || resource.resourceType !== 'image') {
      throw new BadRequestException('Cloudinary upload does not match the signed request');
    }
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(resource.format)) {
      throw new BadRequestException('Cloudinary image format is not allowed');
    }

    this.assertFileSize(upload.type, resource.bytes);

    upload.url = resource.secureUrl;
    upload.size = resource.bytes;
    upload.format = resource.format;
    upload.width = resource.width;
    upload.height = resource.height;
    upload.version = resource.version;
    upload.expiresAt = undefined;
    upload.mimeType = this.mimeTypeFor(resource.format);
    upload.status = UploadStatus.Active;
    return upload.save();
  }

  async attachUploads(
    userId: string,
    uploadIds: string[],
    type: UploadType,
    targetType: UploadTargetType,
    targetId: Types.ObjectId,
  ): Promise<string[]> {
    const uniqueIds = [...new Set(uploadIds)];
    if (uniqueIds.length !== uploadIds.length) {
      throw new BadRequestException('Duplicate upload IDs are not allowed');
    }
    if (!uniqueIds.length) {
      return [];
    }

    const objectIds = uniqueIds.map((id) => new Types.ObjectId(id));
    const ownerId = new Types.ObjectId(userId);
    const reusableAttachment = {
      attachedToType: targetType,
      attachedToId: targetId,
    };
    const attachmentFilter = {
      _id: { $in: objectIds },
      userId: ownerId,
      type,
      status: UploadStatus.Active,
      $or: [
        { attachedToId: { $exists: false } },
        reusableAttachment,
      ],
    };

    const uploads = await this.uploadModel.find(attachmentFilter).exec();
    if (uploads.length !== uniqueIds.length) {
      throw new ForbiddenException(
        'One or more uploads are invalid, belong to another user, or are already in use',
      );
    }

    const result = await this.uploadModel
      .updateMany(attachmentFilter, { $set: reusableAttachment })
      .exec();
    if (result.matchedCount !== uniqueIds.length) {
      throw new ConflictException('Uploads were changed while being attached');
    }

    const urlById = new Map(uploads.map((upload) => [upload.id, upload.url]));
    return uniqueIds.map((id) => urlById.get(id) as string);
  }

  private assertCanUpload(role: Role, type: UploadType) {
    if (type === UploadType.ProductImage && ![Role.Admin, Role.Owner].includes(role)) {
      throw new ForbiddenException('Only admins and owners can upload product images');
    }
    if (type === UploadType.ReviewImage && role !== Role.User) {
      throw new ForbiddenException('Only users can upload review images');
    }
  }

  private assertFileSize(type: UploadType, size: number) {
    const maxSize = type === UploadType.Avatar ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (size > maxSize) {
      throw new BadRequestException(`File exceeds the ${maxSize / 1024 / 1024} MB limit`);
    }
  }

  private folderFor(type: UploadType) {
    const folders: Record<UploadType, string> = {
      [UploadType.Avatar]: 'avatars',
      [UploadType.ProductImage]: 'products',
      [UploadType.ReviewImage]: 'reviews',
    };
    return folders[type];
  }

  private mimeTypeFor(format: string) {
    return `image/${format === 'jpg' ? 'jpeg' : format}`;
  }
}

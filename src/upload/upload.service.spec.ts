import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import {
  UploadProvider,
  UploadStatus,
  UploadTargetType,
  UploadType,
} from '../database/schemas/upload.schema';
import { CloudinaryService } from './cloudinary.service';
import { UploadService } from './upload.service';

describe('UploadService security', () => {
  it('rejects product image signatures for normal users', async () => {
    const service = new UploadService(
      { create: async () => assert.fail('must not create an upload') } as never,
      {} as CloudinaryService,
    );

    await assert.rejects(
      service.createSignature(new Types.ObjectId().toString(), Role.User, {
        type: UploadType.ProductImage,
        originalName: 'product.jpg',
        mimeType: 'image/jpeg',
        size: 1024,
      }),
      ForbiddenException,
    );
  });

  it('creates a pending upload owned by the requesting owner', async () => {
    const userId = new Types.ObjectId().toString();
    let created: Record<string, unknown> = {};
    const service = new UploadService(
      {
        create: async (value: Record<string, unknown>) => {
          created = value;
          return { id: new Types.ObjectId().toString() };
        },
      } as never,
      {
        createUploadSignature: (publicId: string) => ({
          publicId,
          signature: 'signature',
        }),
      } as never,
    );

    const result = await service.createSignature(userId, Role.Owner, {
      type: UploadType.ProductImage,
      originalName: 'product.jpg',
      mimeType: 'image/jpeg',
      size: 1024,
    });

    assert.equal(String(created.userId), userId);
    assert.equal(created.status, UploadStatus.Pending);
    assert.equal(created.provider, UploadProvider.Cloudinary);
    assert.equal(result.signature, 'signature');
  });

  it('only completes uploads owned by the current user', async () => {
    const service = new UploadService(
      {
        findOne: () => ({ exec: async () => null }),
      } as never,
      {} as CloudinaryService,
    );

    await assert.rejects(
      service.completeUpload(
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
      ),
      NotFoundException,
    );
  });

  it('rejects an expired pending upload', async () => {
    const upload = {
      publicId: 'ecommerce/products/user/image',
      type: UploadType.ProductImage,
      status: UploadStatus.Pending,
      expiresAt: new Date(Date.now() - 1000),
    };
    const service = new UploadService(
      {
        findOne: () => ({ exec: async () => upload }),
      } as never,
      {
        getImageResource: async () => assert.fail('must not query Cloudinary'),
      } as never,
    );

    await assert.rejects(
      service.completeUpload(
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
      ),
      BadRequestException,
    );
  });

  it('uses authoritative Cloudinary metadata when completing an upload', async () => {
    const publicId = 'ecommerce/products/user/image';
    const upload = {
      publicId,
      type: UploadType.ProductImage,
      status: UploadStatus.Pending,
      url: '',
      size: 100,
      mimeType: 'image/jpeg',
      save: async () => upload,
    };
    const service = new UploadService(
      {
        findOne: () => ({ exec: async () => upload }),
      } as never,
      {
        getImageResource: async () => ({
          publicId,
          secureUrl: 'https://res.cloudinary.com/demo/image/upload/image.webp',
          bytes: 2048,
          format: 'webp',
          resourceType: 'image',
        }),
      } as never,
    );

    const result = await service.completeUpload(
      new Types.ObjectId().toString(),
      new Types.ObjectId().toString(),
    );

    assert.equal(result.status, UploadStatus.Active);
    assert.equal(result.size, 2048);
    assert.equal(result.mimeType, 'image/webp');
  });

  it('rejects attachments that do not belong to the current user', async () => {
    const service = new UploadService(
      {
        find: () => ({ exec: async () => [] }),
      } as never,
      {} as CloudinaryService,
    );

    await assert.rejects(
      service.attachUploads(
        new Types.ObjectId().toString(),
        [new Types.ObjectId().toString()],
        UploadType.ReviewImage,
        UploadTargetType.Review,
        new Types.ObjectId(),
      ),
      ForbiddenException,
    );
  });

  it('rejects Cloudinary files that exceed the configured type limit', async () => {
    const publicId = 'ecommerce/avatars/user/image';
    const upload = {
      publicId,
      type: UploadType.Avatar,
      status: UploadStatus.Pending,
    };
    const service = new UploadService(
      {
        findOne: () => ({ exec: async () => upload }),
      } as never,
      {
        getImageResource: async () => ({
          publicId,
          secureUrl: 'https://res.cloudinary.com/demo/image/upload/image.jpg',
          bytes: 6 * 1024 * 1024,
          format: 'jpg',
          resourceType: 'image',
        }),
      } as never,
    );

    await assert.rejects(
      service.completeUpload(
        new Types.ObjectId().toString(),
        new Types.ObjectId().toString(),
      ),
      BadRequestException,
    );
  });
});

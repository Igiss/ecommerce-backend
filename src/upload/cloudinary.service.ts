import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export interface CloudinaryResource {
  publicId: string;
  secureUrl: string;
  bytes: number;
  format: string;
  resourceType: string;
  width?: number;
  height?: number;
  version?: number;
}

@Injectable()
export class CloudinaryService {
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(configService: ConfigService) {
    this.cloudName = this.requireConfig(configService, 'CLOUDINARY_CLOUD_NAME');
    this.apiKey = this.requireConfig(configService, 'CLOUDINARY_API_KEY');
    this.apiSecret = this.requireConfig(configService, 'CLOUDINARY_API_SECRET');

    cloudinary.config({
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret,
      secure: true,
    });
  }

  createUploadSignature(publicId: string) {
    const timestamp = Math.floor(Date.now() / 1000);
    const parameters = {
      allowed_formats: 'jpg,png,webp',
      overwrite: false,
      public_id: publicId,
      timestamp,
    };

    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
      cloudName: this.cloudName,
      apiKey: this.apiKey,
      parameters,
      signature: cloudinary.utils.api_sign_request(parameters, this.apiSecret),
    };
  }

  async getImageResource(publicId: string): Promise<CloudinaryResource> {
    const resource = await cloudinary.api.resource(publicId, {
      resource_type: 'image',
      type: 'upload',
    });

    return {
      publicId: resource.public_id,
      secureUrl: resource.secure_url,
      bytes: resource.bytes,
      format: resource.format,
      resourceType: resource.resource_type,
      width: resource.width,
      height: resource.height,
      version: resource.version,
    };
  }

  private requireConfig(configService: ConfigService, key: string) {
    const value = configService.get<string>(key);
    if (!value) {
      throw new Error(`${key} is required`);
    }
    return value;
  }
}

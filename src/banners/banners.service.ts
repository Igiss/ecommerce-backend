import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Banner, BannerDocument } from './schemas/banner.schema';
import { CreateBannerDto, UpdateBannerDto } from './dto/banner.dto';

@Injectable()
export class BannersService {
  constructor(
    @InjectModel(Banner.name) private bannerModel: Model<BannerDocument>,
  ) {}

  async getActiveBanners(): Promise<Banner[]> {
    return this.bannerModel
      .find({ isActive: true })
      .sort({ position: 1, createdAt: -1 })
      .exec();
  }

  async getAllAdminBanners(): Promise<Banner[]> {
    return this.bannerModel.find().sort({ position: 1, createdAt: -1 }).exec();
  }

  async createBanner(dto: CreateBannerDto): Promise<Banner> {
    const newBanner = new this.bannerModel(dto);
    return newBanner.save();
  }

  async updateBanner(id: string, dto: UpdateBannerDto): Promise<Banner> {
    const updated = await this.bannerModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException('Không tìm thấy Banner');
    }
    return updated;
  }

  async toggleActive(id: string): Promise<Banner> {
    const banner = await this.bannerModel.findById(id).exec();
    if (!banner) {
      throw new NotFoundException('Không tìm thấy Banner');
    }
    banner.isActive = !banner.isActive;
    return banner.save();
  }

  async deleteBanner(id: string): Promise<{ message: string }> {
    const result = await this.bannerModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Không tìm thấy Banner để xóa');
    }
    return { message: 'Xóa Banner thành công' };
  }
}

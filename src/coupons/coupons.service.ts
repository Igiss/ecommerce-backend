import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Coupon, CouponDocument, DiscountType } from '../database/schemas/coupon.schema';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(@InjectModel(Coupon.name) private readonly couponModel: Model<CouponDocument>) {}

  async validate(dto: ValidateCouponDto) {
    const coupon = await this.couponModel.findOne({ code: this.normalizeCode(dto.code) }).exec();
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    this.assertUsable(coupon, dto.orderTotal);

    let actualDiscount =
      coupon.discountType === DiscountType.Percentage
        ? Math.floor((dto.orderTotal * coupon.discountAmount) / 100)
        : coupon.discountAmount;

    if (coupon.maxDiscount !== undefined) {
      actualDiscount = Math.min(actualDiscount, coupon.maxDiscount);
    }
    actualDiscount = Math.min(actualDiscount, dto.orderTotal);

    return { coupon, actualDiscount };
  }

  findAll() {
    return this.couponModel.find().sort({ createdAt: -1 }).exec();
  }

  async create(dto: CreateCouponDto) {
    this.validateDiscount(dto.discountType, dto.discountAmount);
    const code = this.normalizeCode(dto.code);
    if (await this.couponModel.exists({ code })) {
      throw new BadRequestException('Coupon code already exists');
    }
    return this.couponModel.create({ ...dto, code });
  }

  async update(id: string, dto: UpdateCouponDto) {
    if (dto.discountType && dto.discountAmount !== undefined) {
      this.validateDiscount(dto.discountType, dto.discountAmount);
    }
    const update = { ...dto, code: dto.code ? this.normalizeCode(dto.code) : undefined };
    const coupon = await this.couponModel.findByIdAndUpdate(id, update, { new: true }).exec();
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return coupon;
  }

  async remove(id: string) {
    const coupon = await this.couponModel.findByIdAndDelete(id).exec();
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return { message: 'Coupon deleted successfully' };
  }

  private assertUsable(coupon: CouponDocument, orderTotal: number) {
    if (!coupon.isActive) throw new BadRequestException('Coupon is inactive');
    if (coupon.expiryDate < new Date()) throw new BadRequestException('Coupon has expired');
    if (coupon.usedCount >= coupon.usageLimit) throw new BadRequestException('Coupon usage limit reached');
    if (orderTotal < coupon.minOrderValue) {
      throw new BadRequestException(`Minimum order value is ${coupon.minOrderValue}`);
    }
  }

  private validateDiscount(type: DiscountType, amount: number) {
    if (type === DiscountType.Percentage && amount > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100');
    }
  }

  private normalizeCode(code: string) {
    return code.trim().toUpperCase();
  }
}


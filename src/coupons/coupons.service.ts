import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Coupon, CouponDocument, DiscountType } from '../database/schemas/coupon.schema';
import {
  CouponUsage,
  CouponUsageDocument,
} from '../database/schemas/coupon-usage.schema';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(
    @InjectModel(Coupon.name) private readonly couponModel: Model<CouponDocument>,
    @InjectModel(CouponUsage.name)
    private readonly couponUsageModel: Model<CouponUsageDocument>,
  ) {}

  async validate(dto: ValidateCouponDto) {
    const coupon = await this.couponModel.findOne({ code: this.normalizeCode(dto.code) }).exec();
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    this.assertUsable(coupon, dto.orderTotal);

    return {
      coupon,
      actualDiscount: this.calculateDiscount(coupon, dto.orderTotal),
    };
  }

  async calculateForOrder(
    userId: string,
    code: string,
    items: Array<{
      productId: Types.ObjectId;
      categoryId: Types.ObjectId;
      ownerId: Types.ObjectId;
      total: number;
    }>,
  ) {
    const coupon = await this.couponModel
      .findOne({ code: this.normalizeCode(code) })
      .exec();
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    const eligibleItems = items.filter((item) => {
      if (coupon.ownerId && !coupon.ownerId.equals(item.ownerId)) return false;
      if (
        (coupon.applicableProductIds || []).length &&
        !(coupon.applicableProductIds || []).some((id) => id.equals(item.productId))
      ) {
        return false;
      }
      if (
        (coupon.applicableCategoryIds || []).length &&
        !(coupon.applicableCategoryIds || []).some((id) => id.equals(item.categoryId))
      ) {
        return false;
      }
      return true;
    });
    const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + item.total, 0);
    this.assertUsable(coupon, eligibleSubtotal);

    const userUsageCount = await this.couponUsageModel.countDocuments({
      couponId: coupon._id,
      userId: new Types.ObjectId(userId),
    });
    if (userUsageCount >= (coupon.perUserLimit || 1)) {
      throw new BadRequestException('Coupon per-user usage limit reached');
    }

    return {
      coupon,
      actualDiscount: this.calculateDiscount(coupon, eligibleSubtotal),
    };
  }

  async recordUsage(
    couponId: Types.ObjectId,
    userId: string,
    orderId: Types.ObjectId,
    discountAmount: number,
  ) {
    const coupon = await this.couponModel
      .findOneAndUpdate(
        { _id: couponId, $expr: { $lt: ['$usedCount', '$usageLimit'] } },
        { $inc: { usedCount: 1 } },
        { new: true },
      )
      .exec();
    if (!coupon) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    try {
      await this.couponUsageModel.create({
        couponId,
        userId: new Types.ObjectId(userId),
        orderId,
        discountAmount,
        usedAt: new Date(),
      });
    } catch (error) {
      await this.couponModel.updateOne({ _id: couponId }, { $inc: { usedCount: -1 } });
      throw error;
    }
  }

  async releaseUsage(orderId: Types.ObjectId) {
    const usage = await this.couponUsageModel.findOneAndDelete({ orderId }).exec();
    if (usage) {
      await this.couponModel.updateOne(
        { _id: usage.couponId, usedCount: { $gt: 0 } },
        { $inc: { usedCount: -1 } },
      );
    }
  }

  findAll() {
    return this.couponModel.find().sort({ createdAt: -1 }).exec();
  }

  async create(dto: CreateCouponDto, ownerId?: string) {
    this.validateDiscount(dto.discountType, dto.discountAmount);
    this.validateDates(dto.startsAt, dto.expiryDate);
    const code = this.normalizeCode(dto.code);
    if (await this.couponModel.exists({ code })) {
      throw new BadRequestException('Coupon code already exists');
    }
    return this.couponModel.create({
      ...dto,
      code,
      ownerId: ownerId ? new Types.ObjectId(ownerId) : undefined,
    });
  }

  async update(id: string, dto: UpdateCouponDto) {
    if (dto.discountType && dto.discountAmount !== undefined) {
      this.validateDiscount(dto.discountType, dto.discountAmount);
    }
    const current = await this.couponModel.findById(id).exec();
    if (!current) {
      throw new NotFoundException('Coupon not found');
    }
    this.validateDates(
      dto.startsAt ?? current.startsAt,
      dto.expiryDate ?? current.expiryDate,
    );
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

  findAllByOwner(ownerId: string) {
    return this.couponModel
      .find({ ownerId: new Types.ObjectId(ownerId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateByOwner(id: string, ownerId: string, dto: UpdateCouponDto) {
    if (dto.discountType && dto.discountAmount !== undefined) {
      this.validateDiscount(dto.discountType, dto.discountAmount);
    }
    const current = await this.couponModel
      .findOne({ _id: new Types.ObjectId(id), ownerId: new Types.ObjectId(ownerId) })
      .exec();
    if (!current) {
      throw new NotFoundException('Coupon not found');
    }
    this.validateDates(
      dto.startsAt ?? current.startsAt,
      dto.expiryDate ?? current.expiryDate,
    );
    const update = { ...dto, code: dto.code ? this.normalizeCode(dto.code) : undefined };
    const coupon = await this.couponModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), ownerId: new Types.ObjectId(ownerId) },
        update,
        { new: true },
      )
      .exec();
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return coupon;
  }

  async removeByOwner(id: string, ownerId: string) {
    const coupon = await this.couponModel
      .findOneAndDelete({
        _id: new Types.ObjectId(id),
        ownerId: new Types.ObjectId(ownerId),
      })
      .exec();
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return { message: 'Coupon deleted successfully' };
  }

  private assertUsable(coupon: CouponDocument, orderTotal: number) {
    if (!coupon.isActive) throw new BadRequestException('Coupon is inactive');
    if (coupon.startsAt && coupon.startsAt > new Date()) {
      throw new BadRequestException('Coupon is not active yet');
    }
    if (coupon.expiryDate < new Date()) throw new BadRequestException('Coupon has expired');
    if (coupon.usedCount >= coupon.usageLimit) throw new BadRequestException('Coupon usage limit reached');
    if (orderTotal < coupon.minOrderValue) {
      throw new BadRequestException(`Minimum order value is ${coupon.minOrderValue}`);
    }
  }

  private calculateDiscount(coupon: CouponDocument, orderTotal: number) {
    let actualDiscount =
      coupon.discountType === DiscountType.Percentage
        ? Math.floor((orderTotal * coupon.discountAmount) / 100)
        : coupon.discountAmount;
    if (coupon.maxDiscount !== undefined) {
      actualDiscount = Math.min(actualDiscount, coupon.maxDiscount);
    }
    return Math.min(actualDiscount, orderTotal);
  }

  private validateDiscount(type: DiscountType, amount: number) {
    if (type === DiscountType.Percentage && amount > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100');
    }
  }

  private validateDates(startsAt?: Date | string, expiryDate?: Date | string) {
    if (
      startsAt &&
      expiryDate &&
      new Date(startsAt).getTime() >= new Date(expiryDate).getTime()
    ) {
      throw new BadRequestException('Coupon start date must be before expiry date');
    }
  }

  private normalizeCode(code: string) {
    return code.trim().toUpperCase();
  }
}

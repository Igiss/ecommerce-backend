import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Coupon, CouponDocument, DiscountType } from '../database/schemas/coupon.schema';
import {
  CouponUsage,
  CouponUsageDocument,
} from '../database/schemas/coupon-usage.schema';
import { Role } from '../common/enums/role.enum';
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
    const coupon = await this.couponModel
      .findOne({ code: this.normalizeCode(dto.code) })
      .populate('ownerId', 'fullName storeName avatar email')
      .exec();
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    let eligibleSubtotal = dto.orderTotal;

    if (dto.items && dto.items.length > 0) {
      const eligibleItems = dto.items.filter((item) => {
        if (coupon.ownerId) {
          const ownerObj = coupon.ownerId as unknown as { _id?: Types.ObjectId; role?: string; storeName?: string };
          const couponOwnerIdStr = ownerObj._id ? ownerObj._id.toString() : String(coupon.ownerId);
          if (item.ownerId && String(item.ownerId) !== couponOwnerIdStr) {
            return false;
          }
        }
        if (
          (coupon.applicableProductIds || []).length &&
          !(coupon.applicableProductIds || []).some(
            (id) => id.toString() === item.productId?.toString(),
          )
        ) {
          return false;
        }
        if (
          (coupon.applicableCategoryIds || []).length &&
          !(coupon.applicableCategoryIds || []).some(
            (id) => id.toString() === item.categoryId?.toString(),
          )
        ) {
          return false;
        }
        return true;
      });

      if (eligibleItems.length === 0) {
        throw new BadRequestException('Mã giảm giá này không áp dụng cho các sản phẩm trong giỏ hàng của bạn');
      }

      eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + (item.total || 0), 0);
    }

    this.assertUsable(coupon, eligibleSubtotal);

    return {
      coupon,
      actualDiscount: this.calculateDiscount(coupon, eligibleSubtotal),
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

  async findAll(scope?: 'system' | 'owner' | 'all') {
    const list = await this.couponModel
      .find()
      .populate('ownerId', 'fullName storeName avatar email role')
      .sort({ createdAt: -1 })
      .exec();

    if (scope === 'system') {
      return list.filter((c) => {
        if (!c.ownerId) return true;
        const owner = c.ownerId as unknown as { role?: string; storeName?: string };
        return owner.role === Role.Admin || (!owner.storeName && owner.role !== Role.Owner);
      });
    }

    if (scope === 'owner') {
      return list.filter((c) => {
        if (!c.ownerId) return false;
        const owner = c.ownerId as unknown as { role?: string; storeName?: string };
        return owner.role === Role.Owner || Boolean(owner.storeName);
      });
    }

    return list;
  }

  findActiveCoupons() {
    return this.couponModel
      .find({
        isActive: true,
      })
      .populate('ownerId', 'fullName storeName avatar email')
      .sort({ createdAt: -1 })
      .exec();
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
    const current = await this.couponModel.findById(id).exec();
    if (!current) {
      throw new NotFoundException('Coupon not found');
    }

    const effectiveDiscountType = dto.discountType ?? current.discountType;
    const effectiveDiscountAmount = dto.discountAmount ?? current.discountAmount;
    this.validateDiscount(effectiveDiscountType, effectiveDiscountAmount);

    const effectiveStartsAt = dto.startsAt ?? current.startsAt;
    const effectiveExpiryDate = dto.expiryDate ?? current.expiryDate;
    this.validateDates(effectiveStartsAt, effectiveExpiryDate);

    if (dto.code) {
      const normalizedCode = this.normalizeCode(dto.code);
      if (normalizedCode !== current.code) {
        const exists = await this.couponModel.exists({ code: normalizedCode });
        if (exists) {
          throw new BadRequestException('Coupon code already exists');
        }
      }
    }

    const updatePayload: Record<string, unknown> = {
      ...dto,
      code: dto.code ? this.normalizeCode(dto.code) : undefined,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
    };
    Object.keys(updatePayload).forEach((key) => updatePayload[key] === undefined && delete updatePayload[key]);

    const coupon = await this.couponModel.findByIdAndUpdate(id, updatePayload, { new: true }).exec();
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
    const current = await this.couponModel
      .findOne({ _id: new Types.ObjectId(id), ownerId: new Types.ObjectId(ownerId) })
      .exec();
    if (!current) {
      throw new NotFoundException('Coupon not found');
    }

    const effectiveDiscountType = dto.discountType ?? current.discountType;
    const effectiveDiscountAmount = dto.discountAmount ?? current.discountAmount;
    this.validateDiscount(effectiveDiscountType, effectiveDiscountAmount);

    const effectiveStartsAt = dto.startsAt ?? current.startsAt;
    const effectiveExpiryDate = dto.expiryDate ?? current.expiryDate;
    this.validateDates(effectiveStartsAt, effectiveExpiryDate);

    if (dto.code) {
      const normalizedCode = this.normalizeCode(dto.code);
      if (normalizedCode !== current.code) {
        const exists = await this.couponModel.exists({ code: normalizedCode });
        if (exists) {
          throw new BadRequestException('Coupon code already exists');
        }
      }
    }

    const updatePayload: Record<string, unknown> = {
      ...dto,
      code: dto.code ? this.normalizeCode(dto.code) : undefined,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
    };
    Object.keys(updatePayload).forEach((key) => updatePayload[key] === undefined && delete updatePayload[key]);

    const coupon = await this.couponModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), ownerId: new Types.ObjectId(ownerId) },
        updatePayload,
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

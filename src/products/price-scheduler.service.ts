import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PriceAdjustmentType,
  ProductPriceSchedule,
  ProductPriceScheduleDocument,
  ScheduleStatus,
} from '../database/schemas/product-price-schedule.schema';
import { Product, ProductDocument } from '../database/schemas/product.schema';

@Injectable()
export class PriceSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PriceSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @InjectModel(ProductPriceSchedule.name)
    private readonly scheduleModel: Model<ProductPriceScheduleDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  onModuleInit() {
    this.logger.log('Khởi chạy PriceSchedulerService (quét 60s/lần)...');
    // Chạy kiểm tra ngay khi ứng dụng khởi động
    void this.processPriceSchedules();
    // Đặt lịch chạy định kỳ mỗi 60 giây
    this.timer = setInterval(() => {
      void this.processPriceSchedules();
    }, 60000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Quét và xử lý tất cả lịch trình giá đến hạn
   */
  async processPriceSchedules(): Promise<void> {
    const now = new Date();

    try {
      // 1. Đổi giá gốc chính thức (BASE_PRICE_CHANGE): PENDING -> APPLIED
      const pendingBasePriceChanges = await this.scheduleModel.find({
        type: PriceAdjustmentType.BASE_PRICE_CHANGE,
        status: ScheduleStatus.PENDING,
        startDate: { $lte: now },
      });

      for (const schedule of pendingBasePriceChanges) {
        await this.productModel.findByIdAndUpdate(schedule.productId, {
          price: schedule.calculatedPrice,
        });

        schedule.status = ScheduleStatus.APPLIED;
        await schedule.save();

        this.logger.log(
          `Đã cập nhật giá gốc mới cho sản phẩm [${schedule.productId}]: ${schedule.calculatedPrice} VNĐ`,
        );
      }

      // 2. Kích hoạt đợt Sale (SALE_CAMPAIGN): PENDING -> ACTIVE
      const pendingSaleCampaigns = await this.scheduleModel.find({
        type: PriceAdjustmentType.SALE_CAMPAIGN,
        status: ScheduleStatus.PENDING,
        startDate: { $lte: now },
        $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gt: now } }],
      });

      for (const schedule of pendingSaleCampaigns) {
        await this.productModel.findByIdAndUpdate(schedule.productId, {
          salePrice: schedule.calculatedPrice,
          saleStartDate: schedule.startDate,
          saleEndDate: schedule.endDate || null,
        });

        schedule.status = ScheduleStatus.ACTIVE;
        await schedule.save();

        this.logger.log(
          `Đã kích hoạt Sale cho sản phẩm [${schedule.productId}]: ${schedule.calculatedPrice} VNĐ`,
        );
      }

      // 3. Tắt đợt Sale đã hết hạn (SALE_CAMPAIGN): ACTIVE -> EXPIRED
      const expiredSaleCampaigns = await this.scheduleModel.find({
        type: PriceAdjustmentType.SALE_CAMPAIGN,
        status: ScheduleStatus.ACTIVE,
        endDate: { $ne: null, $lte: now },
      });

      for (const schedule of expiredSaleCampaigns) {
        await this.productModel.findByIdAndUpdate(schedule.productId, {
          $unset: { salePrice: 1, saleStartDate: 1, saleEndDate: 1 },
        });

        schedule.status = ScheduleStatus.EXPIRED;
        await schedule.save();

        this.logger.log(`Đã kết thúc đợt Sale cho sản phẩm [${schedule.productId}]`);
      }
    } catch (error) {
      this.logger.error('Lỗi khi quét lịch trình điều chỉnh giá sản phẩm', error);
    }
  }
}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Coupon, CouponSchema } from '../database/schemas/coupon.schema';
import { CouponUsage, CouponUsageSchema } from '../database/schemas/coupon-usage.schema';
import { CouponsController } from './coupons.controller';
import { OwnerCouponsController } from './owner-coupons.controller';
import { CouponsService } from './coupons.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Coupon.name, schema: CouponSchema },
      { name: CouponUsage.name, schema: CouponUsageSchema },
    ]),
  ],
  controllers: [CouponsController, OwnerCouponsController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}

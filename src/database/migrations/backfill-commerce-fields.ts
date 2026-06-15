import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../../app.module';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { Coupon, CouponDocument } from '../schemas/coupon.schema';
import { Notification, NotificationDocument } from '../schemas/notification.schema';
import { Order, OrderDocument } from '../schemas/order.schema';
import { Payment, PaymentDocument } from '../schemas/payment.schema';
import { Product, ProductDocument } from '../schemas/product.schema';
import {
  Upload,
  UploadDocument,
  UploadStatus,
} from '../schemas/upload.schema';

async function migrate(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--allow-production')) {
    throw new Error('Use --allow-production to run this migration in production');
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    const orderModel = app.get<Model<OrderDocument>>(getModelToken(Order.name));
    const paymentModel = app.get<Model<PaymentDocument>>(getModelToken(Payment.name));
    const productModel = app.get<Model<ProductDocument>>(getModelToken(Product.name));
    const couponModel = app.get<Model<CouponDocument>>(getModelToken(Coupon.name));
    const notificationModel = app.get<Model<NotificationDocument>>(
      getModelToken(Notification.name),
    );
    const uploadModel = app.get<Model<UploadDocument>>(getModelToken(Upload.name));

    await Promise.all([
      orderModel
        .updateMany(
          {},
          [
            {
              $set: {
                subtotal: {
                  $ifNull: [
                    '$subtotal',
                    {
                      $sum: {
                        $map: {
                          input: '$items',
                          as: 'item',
                          in: { $ifNull: ['$$item.total', 0] },
                        },
                      },
                    },
                  ],
                },
                shippingFee: { $ifNull: ['$shippingFee', 0] },
                discountAmount: { $ifNull: ['$discountAmount', 0] },
              },
            },
          ],
        )
        .exec(),
      productModel
        .updateMany(
          { soldCount: { $exists: false } },
          { $set: { soldCount: 0 } },
        )
        .exec(),
      productModel
        .updateMany(
          { variants: { $exists: false } },
          { $set: { variants: [] } },
        )
        .exec(),
      couponModel
        .updateMany(
          { perUserLimit: { $exists: false } },
          { $set: { perUserLimit: 1 } },
        )
        .exec(),
      couponModel
        .updateMany(
          { applicableProductIds: { $exists: false } },
          { $set: { applicableProductIds: [] } },
        )
        .exec(),
      couponModel
        .updateMany(
          { applicableCategoryIds: { $exists: false } },
          { $set: { applicableCategoryIds: [] } },
        )
        .exec(),
      paymentModel
        .updateMany(
          { refundAmount: { $exists: false } },
          { $set: { refundAmount: 0 } },
        )
        .exec(),
      notificationModel
        .updateMany(
          { isRead: true, readAt: { $exists: false } },
          [{ $set: { readAt: { $ifNull: ['$updatedAt', '$createdAt'] } } }],
        )
        .exec(),
      uploadModel
        .updateMany(
          { status: UploadStatus.Pending, expiresAt: { $exists: false } },
          [{ $set: { expiresAt: { $add: ['$createdAt', 60 * 60 * 1000] } } }],
        )
        .exec(),
    ]);

    const paidPayments = await paymentModel
      .find({ status: PaymentStatus.Paid, paidAt: { $exists: true } })
      .select('orderId paidAt transactionCode')
      .lean()
      .exec();

    for (const payment of paidPayments) {
      await orderModel
        .updateOne(
          { _id: payment.orderId, paidAt: { $exists: false } },
          {
            $set: {
              paidAt: payment.paidAt,
              transactionCode: payment.transactionCode,
            },
          },
        )
        .exec();
    }

    console.log(`Backfilled commerce fields and ${paidPayments.length} paid orders`);
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  void migrate().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}

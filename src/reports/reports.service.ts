import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrderStatus } from '../common/enums/order-status.enum';
import { Order, OrderDocument } from '../database/schemas/order.schema';
import { Product, ProductDocument } from '../database/schemas/product.schema';
import { User, UserDocument } from '../database/schemas/user.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  async getOverview() {
    const [totalUsers, totalProducts, totalOrders, revenueResult, bestSellingProducts] =
      await Promise.all([
        this.userModel.countDocuments().exec(),
        this.productModel.countDocuments({ status: { $ne: 'deleted' } }).exec(),
        this.orderModel.countDocuments().exec(),
        this.orderModel
          .aggregate<{ totalRevenue: number }>([
            { $match: { orderStatus: OrderStatus.Completed } },
            { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
          ])
          .exec(),
        this.orderModel
          .aggregate([
            { $match: { orderStatus: OrderStatus.Completed } },
            { $unwind: '$items' },
            {
              $group: {
                _id: '$items.productId',
                name: { $first: '$items.productName' },
                quantitySold: { $sum: '$items.quantity' },
                revenue: { $sum: '$items.total' },
              },
            },
            { $sort: { quantitySold: -1 } },
            { $limit: 10 },
          ])
          .exec(),
      ]);

    return {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: revenueResult[0]?.totalRevenue || 0,
      bestSellingProducts,
    };
  }
}

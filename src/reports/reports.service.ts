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

  async getDashboard() {
    const [overview, pendingOrders, completedOrders, lowStockProducts] = await Promise.all([
      this.getOverview(),
      this.orderModel.countDocuments({ orderStatus: OrderStatus.Pending }).exec(),
      this.orderModel.countDocuments({ orderStatus: OrderStatus.Completed }).exec(),
      this.productModel.countDocuments({ stock: { $lt: 5 }, status: { $ne: 'deleted' } }).exec(),
    ]);

    return { ...overview, pendingOrders, completedOrders, lowStockProducts };
  }

  async getRevenueChart(period: '7days' | '30days' | '12months') {
    const now = new Date();
    const startDate = new Date(now);
    const isMonthly = period === '12months';

    if (isMonthly) {
      startDate.setMonth(now.getMonth() - 11, 1);
    } else {
      startDate.setDate(now.getDate() - (period === '7days' ? 6 : 29));
    }
    startDate.setHours(0, 0, 0, 0);

    const dateParts = isMonthly
      ? { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }
      : {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };

    return this.orderModel
      .aggregate([
        {
          $match: {
            orderStatus: OrderStatus.Completed,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: dateParts,
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ])
      .exec();
  }

  getTopProducts() {
    return this.orderModel
      .aggregate([
        { $match: { orderStatus: OrderStatus.Completed } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            name: { $first: '$items.productName' },
            image: { $first: '$items.image' },
            totalSold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.total' },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
      ])
      .exec();
  }
}

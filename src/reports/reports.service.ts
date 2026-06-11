import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { OrderStatus } from '../common/enums/order-status.enum';
import { Order, OrderDocument } from '../database/schemas/order.schema';
import { Product, ProductDocument } from '../database/schemas/product.schema';
import { User, UserDocument } from '../database/schemas/user.schema';
import { ReportDateQueryDto } from './dto/report-date-query.dto';

type OrderDateFilter = {
  createdAt?: {
    $gte?: Date;
    $lte?: Date;
  };
};

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  async getOverview(ownerId?: string, query: ReportDateQueryDto = {}) {
    const orderDateFilter = this.buildOrderDateFilter(query);

    if (ownerId) {
      return this.getOwnerOverview(ownerId, orderDateFilter);
    }

    const [totalUsers, totalProducts, totalOrders, revenueResult, bestSellingProducts] =
      await Promise.all([
        this.userModel.countDocuments().exec(),
        this.productModel.countDocuments({ status: { $ne: 'deleted' } }).exec(),
        this.orderModel.countDocuments(orderDateFilter).exec(),
        this.orderModel
          .aggregate<{ totalRevenue: number }>([
            { $match: { orderStatus: OrderStatus.Completed, ...orderDateFilter } },
            { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
          ])
          .exec(),
        this.orderModel
          .aggregate([
            { $match: { orderStatus: OrderStatus.Completed, ...orderDateFilter } },
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

  async getDashboard(ownerId?: string, query: ReportDateQueryDto = {}) {
    const orderDateFilter = this.buildOrderDateFilter(query);

    if (ownerId) {
      const productIds = await this.getOwnerProductIds(ownerId);
      const [overview, pendingOrders, completedOrders, lowStockProducts] = await Promise.all([
        this.getOwnerOverview(ownerId, orderDateFilter, productIds),
        this.countOwnerOrders(productIds, OrderStatus.Pending, orderDateFilter),
        this.countOwnerOrders(productIds, OrderStatus.Completed, orderDateFilter),
        this.productModel
          .countDocuments({
            createdBy: new Types.ObjectId(ownerId),
            stock: { $lt: 5 },
            status: { $ne: 'deleted' },
          })
          .exec(),
      ]);

      return { ...overview, pendingOrders, completedOrders, lowStockProducts };
    }

    const [overview, pendingOrders, completedOrders, lowStockProducts] = await Promise.all([
      this.getOverview(undefined, query),
      this.orderModel
        .countDocuments({ orderStatus: OrderStatus.Pending, ...orderDateFilter })
        .exec(),
      this.orderModel
        .countDocuments({ orderStatus: OrderStatus.Completed, ...orderDateFilter })
        .exec(),
      this.productModel.countDocuments({ stock: { $lt: 5 }, status: { $ne: 'deleted' } }).exec(),
    ]);

    return { ...overview, pendingOrders, completedOrders, lowStockProducts };
  }

  async getRevenueChart(period: '7days' | '30days' | '12months', ownerId?: string) {
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

    const ownerProductIds = ownerId ? await this.getOwnerProductIds(ownerId) : undefined;
    const pipeline: PipelineStage[] = [
      {
        $match: {
          orderStatus: OrderStatus.Completed,
          createdAt: { $gte: startDate },
        },
      },
    ];

    if (ownerProductIds) {
      pipeline.push(
        { $unwind: '$items' },
        { $match: { 'items.productId': { $in: ownerProductIds } } },
        {
          $group: {
            _id: dateParts,
            revenue: { $sum: '$items.total' },
            orderIds: { $addToSet: '$_id' },
          },
        },
        {
          $project: {
            revenue: 1,
            orders: { $size: '$orderIds' },
          },
        },
      );
    } else {
      pipeline.push(
        {
          $group: {
            _id: dateParts,
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
          },
        },
      );
    }

    pipeline.push({ $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } });
    return this.orderModel.aggregate(pipeline).exec();
  }

  async getTopProducts(ownerId?: string, query: ReportDateQueryDto = {}) {
    const ownerProductIds = ownerId ? await this.getOwnerProductIds(ownerId) : undefined;
    return this.aggregateTopProducts(ownerProductIds, this.buildOrderDateFilter(query));
  }

  private aggregateTopProducts(
    ownerProductIds?: Types.ObjectId[],
    orderDateFilter: OrderDateFilter = {},
  ) {
    const pipeline: PipelineStage[] = [
      { $match: { orderStatus: OrderStatus.Completed, ...orderDateFilter } },
      { $unwind: '$items' },
    ];

    if (ownerProductIds) {
      pipeline.push({ $match: { 'items.productId': { $in: ownerProductIds } } });
    }

    pipeline.push(
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
    );

    return this.orderModel.aggregate(pipeline).exec();
  }

  private async getOwnerOverview(
    ownerId: string,
    orderDateFilter: OrderDateFilter,
    existingProductIds?: Types.ObjectId[],
  ) {
    const ownerObjectId = new Types.ObjectId(ownerId);
    const productIds = existingProductIds || (await this.getOwnerProductIds(ownerId));
    const [totalProducts, orderSummary, bestSellingProducts] = await Promise.all([
      this.productModel
        .countDocuments({ createdBy: ownerObjectId, status: { $ne: 'deleted' } })
        .exec(),
      this.orderModel
        .aggregate<{
          totalOrders: number;
          totalRevenue: number;
          customers: Types.ObjectId[];
        }>([
          { $match: orderDateFilter },
          { $unwind: '$items' },
          { $match: { 'items.productId': { $in: productIds } } },
          {
            $group: {
              _id: null,
              orderIds: { $addToSet: '$_id' },
              customers: { $addToSet: '$userId' },
              totalRevenue: {
                $sum: {
                  $cond: [
                    { $eq: ['$orderStatus', OrderStatus.Completed] },
                    '$items.total',
                    0,
                  ],
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              totalOrders: { $size: '$orderIds' },
              totalRevenue: 1,
              customers: 1,
            },
          },
        ])
        .exec(),
      this.aggregateTopProducts(productIds, orderDateFilter),
    ]);

    return {
      totalCustomers: orderSummary[0]?.customers.length || 0,
      totalProducts,
      totalOrders: orderSummary[0]?.totalOrders || 0,
      totalRevenue: orderSummary[0]?.totalRevenue || 0,
      bestSellingProducts,
    };
  }

  private async getOwnerProductIds(ownerId: string) {
    const products = await this.productModel
      .find({
        createdBy: new Types.ObjectId(ownerId),
      })
      .select('_id')
      .lean()
      .exec();

    return products.map((product) => product._id);
  }

  private async countOwnerOrders(
    productIds: Types.ObjectId[],
    orderStatus: OrderStatus,
    orderDateFilter: OrderDateFilter,
  ) {
    const [result] = await this.orderModel
      .aggregate<{ count: number }>([
        {
          $match: {
            orderStatus,
            'items.productId': { $in: productIds },
            ...orderDateFilter,
          },
        },
        { $count: 'count' },
      ])
      .exec();

    return result?.count || 0;
  }

  private buildOrderDateFilter(query: ReportDateQueryDto): OrderDateFilter {
    if (!query.from && !query.to) {
      return {};
    }

    const from = query.from ? this.parseBoundaryDate(query.from, false) : undefined;
    const to = query.to ? this.parseBoundaryDate(query.to, true) : undefined;

    if (from && to && from > to) {
      throw new BadRequestException('"from" must be before or equal to "to"');
    }

    return {
      createdAt: {
        ...(from ? { $gte: from } : {}),
        ...(to ? { $lte: to } : {}),
      },
    };
  }

  private parseBoundaryDate(value: string, endOfDay: boolean) {
    const date = new Date(value);
    if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      date.setUTCHours(23, 59, 59, 999);
    }
    return date;
  }
}

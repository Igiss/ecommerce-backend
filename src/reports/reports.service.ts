import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { OrderStatus } from '../common/enums/order-status.enum';
import { Order, OrderDocument } from '../database/schemas/order.schema';
import { Product, ProductDocument } from '../database/schemas/product.schema';
import { Coupon, CouponDocument } from '../database/schemas/coupon.schema';
import { User, UserDocument } from '../database/schemas/user.schema';
import { ReportDateQueryDto } from './dto/report-date-query.dto';
import { AiService } from '../ai/ai.service';

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
    @InjectModel(Coupon.name) private readonly couponModel: Model<CouponDocument>,
    private readonly aiService: AiService,
  ) {}

  async getOwnerDashboard(ownerId: string) {
    const ownerObjectId = new Types.ObjectId(ownerId);
    
    // Tối ưu sẵn vì dùng items.ownerId
    const [orderSummary, productCount, couponCount] = await Promise.all([
      this.orderModel
        .aggregate<{
          orderCount: number;
          revenue: number;
          itemCount: number;
        }>([
          { $match: { 'items.ownerId': ownerObjectId } },
          { $unwind: '$items' },
          { $match: { 'items.ownerId': ownerObjectId } },
          {
            $group: {
              _id: null,
              orderIds: { $addToSet: '$_id' },
              revenue: {
                $sum: {
                  $cond: [
                    { $eq: ['$items.fulfillmentStatus', OrderStatus.Completed] },
                    '$items.total',
                    0,
                  ],
                },
              },
              itemCount: { $sum: '$items.quantity' },
            },
          },
          {
            $project: {
              _id: 0,
              orderCount: { $size: '$orderIds' },
              revenue: 1,
              itemCount: 1,
            },
          },
        ])
        .exec(),
      this.productModel
        .countDocuments({
          createdBy: ownerObjectId,
          status: { $ne: 'deleted' },
        })
        .exec(),
      this.couponModel.countDocuments({ ownerId: ownerObjectId }).exec(),
    ]);

    return {
      ...(orderSummary[0] || { orderCount: 0, revenue: 0, itemCount: 0 }),
      productCount,
      couponCount,
    };
  }

  async getOverview(ownerId?: string, query: ReportDateQueryDto = {}) {
    const data = await this.getDashboardStats(ownerId, query);
    return {
      totalUsers: ownerId ? undefined : data.totalUsers,
      totalCustomers: ownerId ? data.totalCustomers : undefined,
      totalProducts: data.totalProducts,
      totalOrders: data.totalOrders,
      totalRevenue: data.totalRevenue,
      bestSellingProducts: data.bestSellingProducts,
    };
  }

  async getDashboard(ownerId?: string, query: ReportDateQueryDto = {}) {
    return this.getDashboardStats(ownerId, query);
  }

  /**
   * Tối ưu hóa toàn diện bằng $facet và items.ownerId.
   * Quét bảng Order đúng 1 lần và rẽ nhánh tính toán.
   */
  private async getDashboardStats(ownerId?: string, query: ReportDateQueryDto = {}) {
    const orderDateFilter = this.buildOrderDateFilter(query);
    const orderMatch: any = { ...orderDateFilter };
    
    // Sử dụng items.ownerId thay vì $in: productIds
    if (ownerId) {
      orderMatch['items.ownerId'] = new Types.ObjectId(ownerId);
    }

    const [userCount, productStats, orderFacetResult] = await Promise.all([
      !ownerId ? this.userModel.countDocuments().exec() : Promise.resolve(0),
      this.productModel.aggregate([
        { 
          $match: { 
            status: { $ne: 'deleted' }, 
            ...(ownerId ? { createdBy: new Types.ObjectId(ownerId) } : {}) 
          } 
        },
        { 
          $facet: {
            totalProducts: [{ $count: 'count' }],
            lowStockProducts: [{ $match: { stock: { $lt: 5 } } }, { $count: 'count' }]
          }
        }
      ]).exec(),
      this.orderModel.aggregate([
        { $match: orderMatch },
        {
          $facet: {
            pendingOrders: [
              { $match: { orderStatus: OrderStatus.Pending } },
              { $count: 'count' }
            ],
            completedOrders: [
              { $match: { orderStatus: OrderStatus.Completed } },
              { $count: 'count' }
            ],
            overview: [
              { $match: { orderStatus: OrderStatus.Completed } },
              { $unwind: '$items' },
              ...(ownerId ? [{ $match: { 'items.ownerId': new Types.ObjectId(ownerId) } }] : []),
              {
                $group: {
                  _id: null,
                  orderIds: { $addToSet: '$_id' },
                  customers: { $addToSet: '$userId' },
                  totalRevenue: { $sum: '$items.total' }
                }
              }
            ],
            bestSelling: [
              { $match: { orderStatus: OrderStatus.Completed } },
              { $unwind: '$items' },
              ...(ownerId ? [{ $match: { 'items.ownerId': new Types.ObjectId(ownerId) } }] : []),
              {
                $group: {
                  _id: '$items.productId',
                  name: { $first: '$items.productName' },
                  image: { $first: '$items.image' },
                  totalSold: { $sum: '$items.quantity' },
                  revenue: { $sum: '$items.total' }
                }
              },
              { $sort: { totalSold: -1 } },
              { $limit: 10 }
            ]
          }
        }
      ]).exec()
    ]);

    const pStats = productStats[0] || {};
    const oStats = orderFacetResult[0] || {};
    const overviewData = oStats.overview?.[0] || {};

    return {
      totalUsers: userCount,
      totalProducts: pStats.totalProducts?.[0]?.count || 0,
      lowStockProducts: pStats.lowStockProducts?.[0]?.count || 0,
      totalCustomers: overviewData.customers?.length || 0,
      totalOrders: overviewData.orderIds?.length || 0,
      totalRevenue: overviewData.totalRevenue || 0,
      bestSellingProducts: oStats.bestSelling || [],
      pendingOrders: oStats.pendingOrders?.[0]?.count || 0,
      completedOrders: oStats.completedOrders?.[0]?.count || 0,
    };
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

    const pipeline: PipelineStage[] = [
      {
        $match: {
          orderStatus: OrderStatus.Completed,
          createdAt: { $gte: startDate },
        },
      },
    ];

    if (ownerId) {
      (pipeline[0] as any).$match['items.ownerId'] = new Types.ObjectId(ownerId);
      pipeline.push(
        { $unwind: '$items' },
        { $match: { 'items.ownerId': new Types.ObjectId(ownerId) } },
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
    const orderDateFilter = this.buildOrderDateFilter(query);
    const pipeline: PipelineStage[] = [
      { $match: { orderStatus: OrderStatus.Completed, ...orderDateFilter } },
    ];

    if (ownerId) {
      (pipeline[0] as any).$match['items.ownerId'] = new Types.ObjectId(ownerId);
      pipeline.push({ $unwind: '$items' });
      pipeline.push({ $match: { 'items.ownerId': new Types.ObjectId(ownerId) } });
    } else {
      pipeline.push({ $unwind: '$items' });
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

  async getAiTrendReport(ownerId?: string) {
    // 1. Cung cấp dữ liệu Time-series cho AI
    const revenueChart = await this.getRevenueChart('30days', ownerId);
    
    // 2. Cung cấp tổng quan
    const dashboard = await this.getDashboard(ownerId);
    
    // 3. Truyền ownerId để fix lỗi data leakage trong cache
    return this.aiService.generateTrendReport({
      overview: dashboard,
      revenueTrends: revenueChart
    }, ownerId);
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

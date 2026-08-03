import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { OrderStatus } from '../common/enums/order-status.enum';
import { Role } from '../common/enums/role.enum';
import { Order, OrderDocument } from '../database/schemas/order.schema';
import { Product, ProductDocument } from '../database/schemas/product.schema';
import { Coupon, CouponDocument } from '../database/schemas/coupon.schema';
import { User, UserDocument } from '../database/schemas/user.schema';
import { ReportDateQueryDto } from './dto/report-date-query.dto';
import { AdminShopComparisonQueryDto } from './dto/admin-shop-comparison-query.dto';
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

  async getOwnerAnalytics(
    ownerId: string,
    period: '7days' | '30days' | '12months' = '30days',
  ) {
    const ownerObjectId = new Types.ObjectId(ownerId);
    const now = new Date();
    const startDate = new Date(now);

    if (period === '12months') {
      startDate.setMonth(now.getMonth() - 11, 1);
    } else {
      startDate.setDate(now.getDate() - (period === '7days' ? 6 : 29));
    }
    startDate.setHours(0, 0, 0, 0);

    const dateQuery: ReportDateQueryDto = {
      from: startDate.toISOString(),
      to: now.toISOString(),
    };

    const [lifetime, dashboard, revenueChart, topProducts, statusResult] =
      await Promise.all([
        this.getOwnerDashboard(ownerId),
        this.getDashboard(ownerId, dateQuery),
        this.getRevenueChart(period, ownerId),
        this.getTopProducts(ownerId, dateQuery),
        this.orderModel
          .aggregate<{
            byStatus: Array<{
              _id: OrderStatus;
              orders: number;
              items: number;
            }>;
            totals: Array<{
              orderCount: number;
              itemCount: number;
            }>;
          }>([
            {
              $match: {
                'items.ownerId': ownerObjectId,
                createdAt: { $gte: startDate, $lte: now },
              },
            },
            { $unwind: '$items' },
            { $match: { 'items.ownerId': ownerObjectId } },
            {
              $facet: {
                byStatus: [
                  {
                    $group: {
                      _id: '$items.fulfillmentStatus',
                      orderIds: { $addToSet: '$_id' },
                      items: { $sum: '$items.quantity' },
                    },
                  },
                  {
                    $project: {
                      orders: { $size: '$orderIds' },
                      items: 1,
                    },
                  },
                ],
                totals: [
                  {
                    $group: {
                      _id: null,
                      orderIds: { $addToSet: '$_id' },
                      itemCount: { $sum: '$items.quantity' },
                    },
                  },
                  {
                    $project: {
                      _id: 0,
                      orderCount: { $size: '$orderIds' },
                      itemCount: 1,
                    },
                  },
                ],
              },
            },
          ])
          .exec(),
      ]);

    const statusData = statusResult[0] || { byStatus: [], totals: [] };

    return {
      period,
      periodStart: startDate,
      periodEnd: now,
      lifetime,
      dashboard,
      revenueChart,
      topProducts,
      statusBreakdown: statusData.byStatus,
      periodOrderCount: statusData.totals[0]?.orderCount || 0,
      periodItemCount: statusData.totals[0]?.itemCount || 0,
    };
  }

  async getAdminAnalytics(
    period: '7days' | '30days' | '12months' = '30days',
  ) {
    const now = new Date();
    const startDate = new Date(now);

    if (period === '12months') {
      startDate.setMonth(now.getMonth() - 11, 1);
    } else {
      startDate.setDate(now.getDate() - (period === '7days' ? 6 : 29));
    }
    startDate.setHours(0, 0, 0, 0);

    const dateQuery: ReportDateQueryDto = {
      from: startDate.toISOString(),
      to: now.toISOString(),
    };

    const [dashboard, revenueChart, topProducts, statusResult, userResult] =
      await Promise.all([
        this.getDashboard(undefined, dateQuery),
        this.getRevenueChart(period),
        this.getTopProducts(undefined, dateQuery),
        this.orderModel
          .aggregate<{
            byStatus: Array<{ _id: OrderStatus; orders: number }>;
            totals: Array<{ orderCount: number }>;
          }>([
            {
              $match: {
                createdAt: { $gte: startDate, $lte: now },
              },
            },
            {
              $facet: {
                byStatus: [
                  {
                    $group: {
                      _id: '$orderStatus',
                      orders: { $sum: 1 },
                    },
                  },
                ],
                totals: [
                  { $count: 'orderCount' },
                ],
              },
            },
          ])
          .exec(),
        this.userModel
          .aggregate<{
            totalUsers: Array<{ count: number }>;
            customers: Array<{ count: number }>;
            owners: Array<{ count: number }>;
            pendingOwners: Array<{ count: number }>;
            blockedUsers: Array<{ count: number }>;
          }>([
            {
              $facet: {
                totalUsers: [{ $count: 'count' }],
                customers: [
                  { $match: { role: Role.User } },
                  { $count: 'count' },
                ],
                owners: [
                  { $match: { role: Role.Owner } },
                  { $count: 'count' },
                ],
                pendingOwners: [
                  {
                    $match: {
                      role: Role.User,
                      isRequestingOwner: true,
                    },
                  },
                  { $count: 'count' },
                ],
                blockedUsers: [
                  { $match: { status: 'blocked' } },
                  { $count: 'count' },
                ],
              },
            },
          ])
          .exec(),
      ]);

    const statusData = statusResult[0] || { byStatus: [], totals: [] };
    const userData = userResult[0] || {
      totalUsers: [],
      customers: [],
      owners: [],
      pendingOwners: [],
      blockedUsers: [],
    };

    return {
      period,
      periodStart: startDate,
      periodEnd: now,
      dashboard,
      revenueChart,
      topProducts,
      statusBreakdown: statusData.byStatus,
      periodOrderCount: statusData.totals[0]?.orderCount || 0,
      users: {
        total: userData.totalUsers[0]?.count || 0,
        customers: userData.customers[0]?.count || 0,
        owners: userData.owners[0]?.count || 0,
        pendingOwners: userData.pendingOwners[0]?.count || 0,
        blocked: userData.blockedUsers[0]?.count || 0,
      },
    };
  }

  /**
   * Báo cáo so sánh chi tiết số lượng bán, doanh thu, đơn hàng giữa các Shop dành cho Admin
   */
  async getAdminShopsComparison(query: AdminShopComparisonQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    let startDate: Date | undefined;
    let endDate: Date = new Date();

    if (query.from || query.to) {
      const filter = this.buildOrderDateFilter(query);
      startDate = filter.createdAt?.$gte;
      endDate = filter.createdAt?.$lte || new Date();
    } else if (query.period) {
      startDate = new Date(endDate);
      if (query.period === '12months') {
        startDate.setMonth(endDate.getMonth() - 11, 1);
      } else {
        startDate.setDate(endDate.getDate() - (query.period === '7days' ? 6 : 29));
      }
      startDate.setHours(0, 0, 0, 0);
    }

    const orderDateMatch: Record<string, any> = {};
    if (startDate || endDate) {
      orderDateMatch.createdAt = {
        ...(startDate ? { $gte: startDate } : {}),
        ...(endDate ? { $lte: endDate } : {}),
      };
    }

    const ownerMatch: Record<string, any> = { role: Role.Owner };
    if (query.search && query.search.trim()) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      ownerMatch.$or = [
        { storeName: searchRegex },
        { fullName: searchRegex },
        { email: searchRegex },
      ];
    }

    const sortField = query.sortBy || 'totalItemsSold';
    const sortOrder = query.order === 'asc' ? 1 : -1;

    const pipeline: PipelineStage[] = [
      { $match: ownerMatch },
      {
        $lookup: {
          from: 'products',
          let: { ownerId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$createdBy', '$$ownerId'] },
                    { $ne: ['$status', 'deleted'] },
                  ],
                },
              },
            },
            { $count: 'count' },
          ],
          as: 'productCountDoc',
        },
      },
      {
        $lookup: {
          from: 'orders',
          let: { ownerId: '$_id' },
          pipeline: [
            {
              $match: {
                ...orderDateMatch,
                'items.ownerId': { $exists: true },
              },
            },
            { $unwind: '$items' },
            {
              $match: {
                $expr: { $eq: ['$items.ownerId', '$$ownerId'] },
              },
            },
            {
              $group: {
                _id: null,
                orderIds: { $addToSet: '$_id' },
                completedOrderIds: {
                  $addToSet: {
                    $cond: [
                      { $eq: ['$items.fulfillmentStatus', OrderStatus.Completed] },
                      '$_id',
                      '$$REMOVE',
                    ],
                  },
                },
                totalItemsSold: {
                  $sum: {
                    $cond: [
                      { $ne: ['$items.fulfillmentStatus', OrderStatus.Cancelled] },
                      '$items.quantity',
                      0,
                    ],
                  },
                },
                totalRevenue: {
                  $sum: {
                    $cond: [
                      { $eq: ['$items.fulfillmentStatus', OrderStatus.Completed] },
                      '$items.total',
                      0,
                    ],
                  },
                },
              },
            },
          ],
          as: 'orderStatsDoc',
        },
      },
      {
        $project: {
          _id: 0,
          ownerId: '$_id',
          storeName: { $ifNull: ['$storeName', '$fullName'] },
          fullName: '$fullName',
          email: '$email',
          phone: { $ifNull: ['$storePhone', '$phone'] },
          avatar: '$avatar',
          totalProducts: { $ifNull: [{ $arrayElemAt: ['$productCountDoc.count', 0] }, 0] },
          totalOrders: {
            $ifNull: [
              { $size: { $ifNull: [{ $arrayElemAt: ['$orderStatsDoc.orderIds', 0] }, []] } },
              0,
            ],
          },
          completedOrders: {
            $ifNull: [
              { $size: { $ifNull: [{ $arrayElemAt: ['$orderStatsDoc.completedOrderIds', 0] }, []] } },
              0,
            ],
          },
          totalItemsSold: { $ifNull: [{ $arrayElemAt: ['$orderStatsDoc.totalItemsSold', 0] }, 0] },
          totalRevenue: { $ifNull: [{ $arrayElemAt: ['$orderStatsDoc.totalRevenue', 0] }, 0] },
        },
      },
      {
        $addFields: {
          completionRate: {
            $cond: [
              { $gt: ['$totalOrders', 0] },
              {
                $round: [
                  { $multiply: [{ $divide: ['$completedOrders', '$totalOrders'] }, 100] },
                  2,
                ],
              },
              0,
            ],
          },
        },
      },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [{ $sort: { [sortField]: sortOrder, storeName: 1 } }, { $skip: skip }, { $limit: limit }],
        },
      },
    ];

    const result = await this.userModel.aggregate(pipeline).exec();
    const facetData = result[0] || { metadata: [], data: [] };
    const total = facetData.metadata[0]?.total || 0;

    return {
      data: facetData.data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Biểu đồ so sánh tăng trưởng doanh số/số lượng bán của Top các Shop theo thời gian
   */
  async getAdminShopsTrendChart(query: AdminShopComparisonQueryDto) {
    const period = query.period || '30days';
    const now = new Date();
    const startDate = new Date(now);

    if (period === '12months') {
      startDate.setMonth(now.getMonth() - 11, 1);
    } else {
      startDate.setDate(now.getDate() - (period === '7days' ? 6 : 29));
    }
    startDate.setHours(0, 0, 0, 0);

    const topShopsComparison = await this.getAdminShopsComparison({
      period,
      sortBy: query.sortBy || 'totalItemsSold',
      order: 'desc',
      page: 1,
      limit: 5,
    });

    const topShopIds = topShopsComparison.data.map(
      (shop: any) => new Types.ObjectId(shop.ownerId),
    );

    if (topShopIds.length === 0) {
      return { period, shops: [], chartData: [] };
    }

    const isMonthly = period === '12months';
    const dateGroup = isMonthly
      ? {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        }
      : {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };

    const pipeline: PipelineStage[] = [
      {
        $match: {
          createdAt: { $gte: startDate, $lte: now },
          'items.ownerId': { $in: topShopIds },
        },
      },
      { $unwind: '$items' },
      {
        $match: {
          'items.ownerId': { $in: topShopIds },
        },
      },
      {
        $group: {
          _id: {
            date: dateGroup,
            ownerId: '$items.ownerId',
          },
          totalItemsSold: { $sum: '$items.quantity' },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$items.fulfillmentStatus', OrderStatus.Completed] },
                '$items.total',
                0,
              ],
            },
          },
        },
      },
      { $sort: { '_id.date.year': 1, '_id.date.month': 1, '_id.date.day': 1 } },
    ];

    const rawChartData = await this.orderModel.aggregate(pipeline).exec();

    return {
      period,
      shops: topShopsComparison.data.map((shop: any) => ({
        ownerId: shop.ownerId,
        storeName: shop.storeName,
      })),
      chartData: rawChartData.map((item) => ({
        date: item._id.date,
        ownerId: item._id.ownerId,
        totalItemsSold: item.totalItemsSold,
        totalRevenue: item.totalRevenue,
      })),
    };
  }

  /**
   * Thống kê đóng góp số lượng bán của các Shop theo từng Danh mục sản phẩm
   */
  async getAdminShopsCategoryBreakdown(query: ReportDateQueryDto = {}) {
    const orderDateFilter = this.buildOrderDateFilter(query);

    const pipeline: PipelineStage[] = [
      {
        $match: {
          ...orderDateFilter,
          'items.ownerId': { $exists: true },
        },
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'productDoc',
        },
      },
      { $unwind: '$productDoc' },
      {
        $lookup: {
          from: 'categories',
          localField: 'productDoc.categoryId',
          foreignField: '_id',
          as: 'categoryDoc',
        },
      },
      { $unwind: '$categoryDoc' },
      {
        $lookup: {
          from: 'users',
          localField: 'items.ownerId',
          foreignField: '_id',
          as: 'ownerDoc',
        },
      },
      { $unwind: '$ownerDoc' },
      {
        $group: {
          _id: {
            categoryId: '$categoryDoc._id',
            categoryName: '$categoryDoc.name',
            ownerId: '$items.ownerId',
            storeName: { $ifNull: ['$ownerDoc.storeName', '$ownerDoc.fullName'] },
          },
          totalItemsSold: { $sum: '$items.quantity' },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$items.fulfillmentStatus', OrderStatus.Completed] },
                '$items.total',
                0,
              ],
            },
          },
        },
      },
      {
        $group: {
          _id: {
            categoryId: '$_id.categoryId',
            categoryName: '$_id.categoryName',
          },
          shops: {
            $push: {
              ownerId: '$_id.ownerId',
              storeName: '$_id.storeName',
              totalItemsSold: '$totalItemsSold',
              totalRevenue: '$totalRevenue',
            },
          },
          categoryTotalItemsSold: { $sum: '$totalItemsSold' },
          categoryTotalRevenue: { $sum: '$totalRevenue' },
        },
      },
      { $sort: { categoryTotalItemsSold: -1 } },
    ];

    return this.orderModel.aggregate(pipeline).exec();
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

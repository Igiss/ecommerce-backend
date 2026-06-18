import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { OrderStatus } from '../common/enums/order-status.enum';
import { Role } from '../common/enums/role.enum';
import { Order, OrderDocument } from '../database/schemas/order.schema';
import { Product, ProductDocument, ProductStatus } from '../database/schemas/product.schema';
import { CustomDesign, CustomDesignDocument } from '../database/schemas/custom-design.schema';
import { ShippingUnit, ShippingUnitDocument } from '../database/schemas/shipping-unit.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateAdminOrderStatusDto } from './dto/update-admin-order-status.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PickupOrderDto } from './dto/pickup-order.dto';
import { CouponsService } from '../coupons/coupons.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(CustomDesign.name) private readonly customDesignModel: Model<CustomDesignDocument>,
    @InjectModel(ShippingUnit.name) private readonly shippingUnitModel: Model<ShippingUnitDocument>,
    private readonly couponsService: CouponsService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    if (!dto.items.length) {
      throw new BadRequestException('Order items are required');
    }

    const reservedItems: Array<{ productId: Types.ObjectId; quantity: number }> = [];
    try {
      const pricedItems = [];
      for (const item of dto.items) {
        if (!item.productId) {
          throw new BadRequestException('productId is required');
        }

        const product = await this.productModel
          .findOneAndUpdate(
            {
              productId: item.productId,
              status: ProductStatus.Active,
              stock: { $gte: item.quantity },
            },
            {
              $inc: {
                stock: -item.quantity,
                soldCount: item.quantity,
              },
            },
            { new: true },
          )
          .exec();

        if (!product) {
          throw new BadRequestException('Product is unavailable or out of stock');
        }
        reservedItems.push({ productId: product._id, quantity: item.quantity });

        if (item.customDesignId) {
          const design = await this.customDesignModel.findById(item.customDesignId).exec();
          if (!design) {
            throw new NotFoundException('Custom design not found');
          }
        }

        const price = product.salePrice ?? product.price;
        pricedItems.push({
          productId: product._id,
          categoryId: product.categoryId,
          customDesignId: item.customDesignId ? new Types.ObjectId(item.customDesignId) : undefined,
          ownerId: product.createdBy,
          productName: product.name,
          productType: product.productType,
          quantity: item.quantity,
          price,
          total: price * item.quantity,
          image: product.images[0],
        });
      }

      const subtotal = pricedItems.reduce((sum, item) => sum + item.total, 0);
      const shippingFee = subtotal > 500000 ? 0 : 30000;
      const couponResult = dto.couponCode
        ? await this.couponsService.calculateForOrder(userId, dto.couponCode, pricedItems)
        : undefined;
      const discountAmount = couponResult?.actualDiscount || 0;
      const totalAmount = Math.max(subtotal + shippingFee - discountAmount, 0);
      const orderId = new Types.ObjectId();
      const items = pricedItems.map(({ categoryId: _categoryId, ...item }) => item);

      const order = await this.orderModel.create({
        _id: orderId,
        userId: new Types.ObjectId(userId),
        items,
        subtotal,
        shippingFee,
        discountAmount,
        totalAmount,
        couponId: couponResult?.coupon._id,
        couponCode: couponResult?.coupon.code,
        shippingAddress: dto.shippingAddress,
        paymentMethod: dto.paymentMethod,
        note: dto.note || '',
      });

      if (couponResult) {
        try {
          await this.couponsService.recordUsage(
            couponResult.coupon._id,
            userId,
            orderId,
            discountAmount,
          );
        } catch (error) {
          await this.orderModel.findByIdAndDelete(orderId).exec();
          throw error;
        }
      }
      return order;
    } catch (error) {
      await Promise.all(
        reservedItems.map((item) =>
          this.productModel.updateOne(
            { _id: item.productId },
            { $inc: { stock: item.quantity, soldCount: -item.quantity } },
          ),
        ),
      );
      throw error;
    }
  }

  async findMine(userId: string) {
    return this.orderModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async findAll() {
    return this.orderModel
      .find()
      .populate('userId', 'fullName email phone')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, userId: string, role: Role) {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const isAdmin = role === Role.Admin;
    const isOwner = order.userId.toString() === userId;
    const isShipper = role === Role.Shipper && order.shipperId?.toString() === userId;

    if (!isAdmin && !isOwner && !isShipper) {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }

  /**
   * Admin confirm đơn hàng.
   * Sau khi confirm, tự động tìm ShippingUnit theo phường/xã → gán luôn (assigned).
   * Nếu không tìm được ShippingUnit phù hợp → vẫn set confirmed, admin override sau.
   */
  async updateStatus(id: string, dto: UpdateAdminOrderStatusDto) {
    // Admin chỉ được set Confirmed
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.orderStatus !== OrderStatus.Pending) {
      throw new BadRequestException('Only pending orders can be confirmed');
    }

    // Tự động tìm ShippingUnit theo phường/xã
    const ward = order.shippingAddress.ward;
    const shippingUnit = await this.shippingUnitModel
      .findOne({ coverageWards: ward })
      .exec();

    const now = new Date();

    if (shippingUnit) {
      // Có ShippingUnit phủ sóng → tự động assign luôn
      await this.orderModel.findByIdAndUpdate(id, {
        orderStatus: OrderStatus.Assigned,
        shippingUnitId: shippingUnit.userId,
        assignedAt: now,
      }).exec();

      return this.orderModel.findById(id).exec();
    }

    // Không tìm được → chỉ confirm, admin sẽ override sau
    await this.orderModel.findByIdAndUpdate(id, {
      orderStatus: OrderStatus.Confirmed,
    }).exec();

    return this.orderModel.findById(id).exec();
  }

  /**
   * Admin override: gán ShippingUnit cho đơn confirmed/assigned.
   * Dùng khi cần can thiệp thủ công.
   */
  async overrideShippingUnit(orderId: string, shippingUnitUserId: string) {
    const shippingUnit = await this.shippingUnitModel
      .findOne({ userId: new Types.ObjectId(shippingUnitUserId) })
      .exec();

    if (!shippingUnit) {
      throw new NotFoundException('ShippingUnit not found');
    }

    const order = await this.orderModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(orderId),
          orderStatus: { $in: [OrderStatus.Confirmed, OrderStatus.Assigned] },
        },
        {
          orderStatus: OrderStatus.Assigned,
          shippingUnitId: new Types.ObjectId(shippingUnitUserId),
          shipperId: null,      // reset shipper cũ nếu có
          assignedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found or cannot be reassigned at current status');
    }
    return order;
  }

  async cancelMine(id: string, userId: string, cancelReason?: string) {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId.toString() !== userId) {
      throw new ForbiddenException('You can only cancel your own orders');
    }

    if (order.orderStatus !== OrderStatus.Pending) {
      throw new BadRequestException('Only pending orders can be cancelled');
    }

    order.orderStatus = OrderStatus.Cancelled;
    order.cancelReason = cancelReason;
    order.cancelledAt = new Date();
    await Promise.all([
      ...order.items
        .filter((item) => Boolean(item.productId))
        .map((item) =>
          this.productModel.updateOne(
            { _id: item.productId },
            { $inc: { stock: item.quantity, soldCount: -item.quantity } },
          ),
        ),
      order.couponId
        ? this.couponsService.releaseUsage(order._id)
        : Promise.resolve(),
    ]);
    return order.save();
  }

  // ─── Shipper methods ─────────────────────────────────────────────────────

  /** [Shipper] Lấy đơn hàng được assign riêng cho mình */
  async findAllForShipper(shipperId: string) {
    return this.orderModel
      .find({
        shipperId: new Types.ObjectId(shipperId),
        orderStatus: { $in: [OrderStatus.Assigned, OrderStatus.Shipping] },
      })
      .populate('userId', 'fullName email phone')
      .sort({ createdAt: -1 })
      .exec();
  }

  /** [Shipper] Nhận đơn: assigned → shipping */
  async pickupOrder(orderId: string, shipperId: string, dto: PickupOrderDto) {
    const order = await this.orderModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(orderId),
          shipperId: new Types.ObjectId(shipperId),
          orderStatus: OrderStatus.Assigned,
        },
        {
          orderStatus: OrderStatus.Shipping,
          shippedAt: new Date(),
          shippingProvider: dto.shippingProvider,
          trackingCode: dto.trackingCode,
        },
        { new: true },
      )
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found, not assigned to you, or not in assigned status');
    }
    return order;
  }

  /** [Shipper] Hoàn thành giao hàng: shipping → completed */
  async completeDelivery(orderId: string, shipperId: string) {
    const order = await this.orderModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(orderId),
          shipperId: new Types.ObjectId(shipperId),
          orderStatus: OrderStatus.Shipping,
        },
        {
          orderStatus: OrderStatus.Completed,
          completedAt: new Date(),
        },
        { new: true },
      )
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found, not assigned to you, or not in shipping status');
    }
    return order;
  }

  // ─── Owner methods ───────────────────────────────────────────────────────

  findAllByOwner(ownerId: string) {
    return this.orderModel.aggregate(this.ownerOrderPipeline(ownerId)).exec();
  }

  async findOneByOwner(id: string, ownerId: string) {
    const orders = await this.orderModel
      .aggregate([
        {
          $match: {
            _id: new Types.ObjectId(id),
            'items.ownerId': new Types.ObjectId(ownerId),
          },
        },
        ...this.ownerOrderProjection(ownerId),
      ])
      .exec();

    if (!orders[0]) {
      throw new NotFoundException('Order not found');
    }
    return orders[0];
  }

  async updateOwnerFulfillment(id: string, ownerId: string, dto: UpdateOrderStatusDto) {
    const order = await this.orderModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), 'items.ownerId': new Types.ObjectId(ownerId) },
        {
          $set: {
            'items.$[ownerItem].fulfillmentStatus': dto.orderStatus,
            'items.$[ownerItem].fulfillmentNote': dto.cancelReason,
          },
        },
        {
          new: true,
          arrayFilters: [{ 'ownerItem.ownerId': new Types.ObjectId(ownerId) }],
        },
      )
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.findOneByOwner(id, ownerId);
  }

  private ownerOrderPipeline(ownerId: string): PipelineStage[] {
    return [
      { $match: { 'items.ownerId': new Types.ObjectId(ownerId) } },
      ...this.ownerOrderProjection(ownerId),
      { $sort: { createdAt: -1 } },
    ];
  }

  private ownerOrderProjection(ownerId: string): PipelineStage[] {
    return [
      {
        $project: {
          userId: 1,
          shippingAddress: 1,
          paymentMethod: 1,
          paymentStatus: 1,
          paidAt: 1,
          subtotal: 1,
          shippingFee: 1,
          discountAmount: 1,
          couponId: 1,
          couponCode: 1,
          transactionCode: 1,
          orderStatus: 1,
          cancelledAt: 1,
          shippedAt: 1,
          completedAt: 1,
          trackingCode: 1,
          shippingProvider: 1,
          shippingUnitId: 1,
          shipperId: 1,
          note: 1,
          createdAt: 1,
          updatedAt: 1,
          items: {
            $filter: {
              input: '$items',
              as: 'item',
              cond: {
                $eq: ['$$item.ownerId', new Types.ObjectId(ownerId)],
              },
            },
          },
        },
      },
      {
        $set: {
          ownerTotal: { $sum: '$items.total' },
        },
      },
    ];
  }
}

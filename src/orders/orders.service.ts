import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { OrderStatus } from '../common/enums/order-status.enum';
import { PaymentStatus } from '../common/enums/payment-status.enum';
import { Role } from '../common/enums/role.enum';
import { Order, OrderDocument, ReturnStatus } from '../database/schemas/order.schema';
import { Product, ProductDocument, ProductStatus } from '../database/schemas/product.schema';
import { CustomDesign, CustomDesignDocument } from '../database/schemas/custom-design.schema';
import { ShippingUnit, ShippingUnitDocument } from '../database/schemas/shipping-unit.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateAdminOrderStatusDto } from './dto/update-admin-order-status.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PickupOrderDto } from './dto/pickup-order.dto';
import { CouponsService } from '../coupons/coupons.service';
import { getActivePrice } from '../common/helpers/price.helper';
import { ShippingUnitsService } from '../shipping-units/shipping-units.service';
import { InventoryLogsService } from '../inventory-logs/inventory-logs.service';
import { InventoryLogType } from '../database/schemas/inventory-log.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../database/schemas/notification.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(CustomDesign.name) private readonly customDesignModel: Model<CustomDesignDocument>,
    @InjectModel(ShippingUnit.name) private readonly shippingUnitModel: Model<ShippingUnitDocument>,
    private readonly couponsService: CouponsService,
    private readonly shippingUnitsService: ShippingUnitsService,
    private readonly inventoryLogsService: InventoryLogsService,
    private readonly notificationsService: NotificationsService,
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

        const price = getActivePrice(product);
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

      // Log inventory
      await Promise.all(
        pricedItems.map((item) =>
          this.inventoryLogsService.createLog(
            item.productId,
            -item.quantity,
            InventoryLogType.SALE,
            orderId,
            `Order ${orderId}`,
          ),
        ),
      );

      // Tự động phân bổ vận chuyển thay vì chờ Admin duyệt
      try {
        await this.updateStatus(orderId.toString(), {} as any);
      } catch (err) {
        console.error('Failed to auto-assign shipping:', err);
      }

      try {
        await this.notificationsService.create({
          userId,
          title: 'Đặt hàng thành công!',
          message: `Đơn hàng #${orderId.toString()} của bạn đã được đặt thành công. Chúng tôi đang xử lý và chuẩn bị đơn hàng.`,
          type: NotificationType.Order,
          metadata: { orderId: orderId.toString() },
        });
      } catch (err) {
        console.error('Failed to send order creation notification:', err);
      }

      return this.orderModel.findById(orderId).exec();
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
    return this.orderModel.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 }).exec();
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
   * Sau khi confirm, tự động:
   * 1. Tìm ShippingUnit theo phường/xã → gán shippingUnitId
   * 2. Tìm Shipper phụ trách ward đó (round-robin) → gán shipperId
   * Nếu không tìm được ShippingUnit → set confirmed, admin override sau.
   * Nếu tìm được Unit nhưng không có Shipper → assign cho Unit, Unit tự phân tay.
   */
  async updateStatus(id: string, dto: UpdateAdminOrderStatusDto) {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.orderStatus !== OrderStatus.Pending) {
      throw new BadRequestException('Only pending orders can be confirmed');
    }

    const province = order.shippingAddress.province;
    const ward = order.shippingAddress.ward;
    const now = new Date();

    // Bước 1: Tìm ShippingUnit phụ trách phường/xã
    const shippingUnit = await this.shippingUnitModel
      .findOne({ coverageAreas: { $elemMatch: { province, ward } } })
      .exec();

    if (!shippingUnit) {
      // Không tìm được ShippingUnit → chỉ confirm
      await this.orderModel.findByIdAndUpdate(id, {
        orderStatus: OrderStatus.Confirmed,
      }).exec();

      const updatedOrder = await this.orderModel.findById(id).exec();
      return {
        order: updatedOrder,
        autoAssignment: {
          shippingUnit: false,
          shipper: false,
          message: `Khu vực "${ward}, ${province}" chưa có đơn vị vận chuyển phụ trách. Admin cần gán thủ công.`,
        },
      };
    }

    // Bước 2: Tìm Shipper round-robin theo ward
    const shipperResult = await this.shippingUnitsService.autoAssignShipperByArea(
      province,
      ward,
      shippingUnit.userId.toString(),
    );

    const updateData: Record<string, unknown> = {
      orderStatus: OrderStatus.Assigned,
      shippingUnitId: shippingUnit.userId,
      assignedAt: now,
    };

    if (shipperResult) {
      updateData.shipperId = shipperResult.shipperId;
    }

    await this.orderModel.findByIdAndUpdate(id, updateData).exec();
    const updatedOrder = await this.orderModel.findById(id).exec();

    return {
      order: updatedOrder,
      autoAssignment: {
        shippingUnit: true,
        shipper: !!shipperResult,
        shipperName: shipperResult?.shipperName || null,
        message: shipperResult
          ? `Đơn hàng đã được tự động phân cho shipper ${shipperResult.shipperName} (${ward})`
          : `Đã gán đơn vị vận chuyển nhưng chưa tìm thấy shipper phụ trách "${ward}". Đơn vị vận chuyển sẽ phân tay.`,
      },
    };
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
      ...order.items
        .filter((item) => Boolean(item.productId))
        .map((item) =>
          this.inventoryLogsService.createLog(
            item.productId!,
            item.quantity,
            InventoryLogType.CANCEL_ORDER,
            order._id,
            `Order ${order._id} cancelled`,
          ),
        ),
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

  /** [Shipper] Hoàn thành giao hàng: shipping → completed. Đơn COD tự động set paid. */
  async completeDelivery(orderId: string, shipperId: string) {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      shipperId: new Types.ObjectId(shipperId),
      orderStatus: OrderStatus.Shipping,
    }).exec();

    if (!order) {
      throw new NotFoundException('Order not found, not assigned to you, or not in shipping status');
    }

    order.orderStatus = OrderStatus.Completed;
    order.completedAt = new Date();

    order.items.forEach(item => {
      item.fulfillmentStatus = OrderStatus.Completed;
    });

    // Đơn COD: shipper đã nhận tiền khi giao → tự động đánh dấu đã thanh toán
    if (order.paymentMethod?.toUpperCase() === 'COD' && order.paymentStatus !== PaymentStatus.Paid) {
      order.paymentStatus = PaymentStatus.Paid;
      order.paidAt = new Date();
    }

    const savedOrder = await order.save();

    try {
      await this.notificationsService.create({
        userId: savedOrder.userId.toString(),
        title: 'Giao hàng thành công!',
        message: `Đơn hàng #${orderId} đã được giao hàng thành công. Cảm ơn bạn đã mua sắm tại cửa hàng!`,
        type: NotificationType.Order,
        metadata: { orderId },
      });
    } catch (err) {
      console.error('Failed to send order delivery notification:', err);
    }

    return savedOrder;
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

  /** [Owner] Xác nhận đã giao hàng cho đơn vị vận chuyển */
  async ownerHandOverToShipping(orderId: string, ownerId: string) {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      'items.ownerId': new Types.ObjectId(ownerId),
      orderStatus: { $in: [OrderStatus.Assigned, OrderStatus.Shipping] },
    }).exec();

    if (!order) {
      throw new NotFoundException('Order not found or not in assignable status');
    }

    // Kiểm tra xem owner đã giao chưa
    const ownerItems = order.items.filter(
      (item) => item.ownerId.toString() === ownerId,
    );
    const allHandedOver = ownerItems.every((item) => item.handedOverToShipping);
    if (allHandedOver) {
      throw new BadRequestException('Bạn đã xác nhận giao hàng cho đơn vị vận chuyển rồi');
    }

    // Đánh dấu tất cả items của owner là đã giao cho vận chuyển
    await this.orderModel.findOneAndUpdate(
      { _id: new Types.ObjectId(orderId) },
      {
        $set: {
          'items.$[ownerItem].handedOverToShipping': true,
          'items.$[ownerItem].handedOverAt': new Date(),
        },
      },
      {
        arrayFilters: [{ 'ownerItem.ownerId': new Types.ObjectId(ownerId) }],
      },
    ).exec();

    return this.findOneByOwner(orderId, ownerId);
  }

  /** [User] Gửi yêu cầu đổi trả */
  async requestReturn(orderId: string, userId: string, itemId: string, dto: import('./dto/request-return.dto').RequestReturnDto) {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      userId: new Types.ObjectId(userId),
      orderStatus: OrderStatus.Completed, // Chỉ cho đổi trả khi đã hoàn thành
    }).exec();

    if (!order) {
      throw new NotFoundException('Order not found or not eligible for return');
    }

    const item = order.items.find(i => i.productId?.toString() === itemId || i.customDesignId?.toString() === itemId);
    if (!item) {
      throw new NotFoundException('Item not found in order');
    }

    if (item.returnStatus !== ReturnStatus.None && item.returnStatus !== ReturnStatus.Rejected) {
      throw new BadRequestException('Return already requested for this item');
    }

    await this.orderModel.findOneAndUpdate(
      { _id: new Types.ObjectId(orderId) },
      {
        $set: {
          'items.$[item].returnStatus': ReturnStatus.Requested,
          'items.$[item].returnReason': dto.returnReason,
          'items.$[item].returnImages': dto.returnImages || [],
        },
      },
      {
        arrayFilters: [{ 
          $or: [
            { 'item.productId': new Types.ObjectId(itemId) },
            { 'item.customDesignId': new Types.ObjectId(itemId) }
          ]
        }],
      },
    ).exec();

    return this.orderModel.findById(orderId).exec();
  }

  /** [Owner] Cập nhật trạng thái đổi trả */
  async updateReturnStatus(orderId: string, ownerId: string, itemId: string, dto: import('./dto/update-return-status.dto').UpdateReturnStatusDto) {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      'items.ownerId': new Types.ObjectId(ownerId),
    }).exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const item = order.items.find(i => 
      (i.productId?.toString() === itemId || i.customDesignId?.toString() === itemId) && 
      i.ownerId.toString() === ownerId
    );

    if (!item) {
      throw new NotFoundException('Item not found or does not belong to you');
    }

    await this.orderModel.findOneAndUpdate(
      { _id: new Types.ObjectId(orderId) },
      {
        $set: {
          'items.$[item].returnStatus': dto.returnStatus,
        },
      },
      {
        arrayFilters: [{ 
          $or: [
            { 'item.productId': new Types.ObjectId(itemId) },
            { 'item.customDesignId': new Types.ObjectId(itemId) }
          ]
        }],
      },
    ).exec();

    // Nếu Owner xác nhận hàng đã trả về kho -> Log inventory
    if (dto.returnStatus === ReturnStatus.Returned && item.productId) {
      await this.inventoryLogsService.createLog(
        item.productId,
        item.quantity,
        InventoryLogType.RETURN,
        order._id,
        `Item returned for Order ${order._id}`
      );
    }

    return this.findOneByOwner(orderId, ownerId);
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

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { OrderStatus } from '../common/enums/order-status.enum';
import { Role } from '../common/enums/role.enum';
import { Order, OrderDocument } from '../database/schemas/order.schema';
import { Product, ProductDocument, ProductStatus } from '../database/schemas/product.schema';
import { CustomDesign, CustomDesignDocument } from '../database/schemas/custom-design.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(CustomDesign.name) private readonly customDesignModel: Model<CustomDesignDocument>,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    if (!dto.items.length) {
      throw new BadRequestException('Order items are required');
    }

    const items = await Promise.all(
      dto.items.map(async (item) => {
        if (!item.productId) {
          throw new BadRequestException('productId is required');
        }

        const product = await this.productModel
          .findOne({ productId: item.productId, status: { $ne: ProductStatus.Deleted } })
          .exec();

        if (!product) {
          throw new NotFoundException('Product not found');
        }

        if (item.customDesignId) {
          const design = await this.customDesignModel.findById(item.customDesignId).exec();
          if (!design) {
            throw new NotFoundException('Custom design not found');
          }
        }

        const price = product.salePrice ?? product.price;
        return {
          productId: product._id,
          customDesignId: item.customDesignId ? new Types.ObjectId(item.customDesignId) : undefined,
          ownerId: product.createdBy,
          productName: product.name,
          productType: product.productType,
          quantity: item.quantity,
          price,
          total: price * item.quantity,
          image: product.images[0],
        };
      }),
    );

    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

    return this.orderModel.create({
      userId: new Types.ObjectId(userId),
      items,
      totalAmount,
      shippingAddress: dto.shippingAddress,
      paymentMethod: dto.paymentMethod,
      note: dto.note || '',
    });
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

    if (role !== Role.Admin && order.userId.toString() !== userId) {
      throw new ForbiddenException('You can only view your own orders');
    }

    return order;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.orderModel
      .findByIdAndUpdate(
        id,
        { orderStatus: dto.orderStatus, cancelReason: dto.cancelReason },
        { new: true },
      )
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
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
    return order.save();
  }

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

  async updateOwnerFulfillment(
    id: string,
    ownerId: string,
    dto: UpdateOrderStatusDto,
  ) {
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
          orderStatus: 1,
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

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InventoryLog, InventoryLogDocument, InventoryLogType } from '../database/schemas/inventory-log.schema';

@Injectable()
export class InventoryLogsService {
  constructor(
    @InjectModel(InventoryLog.name) private readonly inventoryLogModel: Model<InventoryLogDocument>,
  ) {}

  async createLog(
    productId: Types.ObjectId | string,
    quantityChange: number,
    type: InventoryLogType,
    referenceId?: Types.ObjectId | string,
    note?: string,
  ) {
    if (quantityChange === 0) return null; // No log needed

    const log = new this.inventoryLogModel({
      productId: new Types.ObjectId(productId),
      quantityChange,
      type,
      referenceId: referenceId ? new Types.ObjectId(referenceId) : undefined,
      note,
    });
    return log.save();
  }

  async getLogsByProduct(productId: string) {
    return this.inventoryLogModel
      .find({ productId: new Types.ObjectId(productId) })
      .sort({ createdAt: -1 })
      .exec();
  }
  async getLogsByProducts(productIds: Types.ObjectId[], page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.inventoryLogModel
        .find({ productId: { $in: productIds } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('productId', 'name images sku')
        .exec(),
      this.inventoryLogModel.countDocuments({ productId: { $in: productIds } }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

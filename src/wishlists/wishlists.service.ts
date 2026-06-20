import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wishlist, WishlistDocument } from '../database/schemas/wishlist.schema';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';

@Injectable()
export class WishlistsService {
  constructor(
    @InjectModel(Wishlist.name) private wishlistModel: Model<WishlistDocument>,
  ) {}

  async getWishlist(userId: string) {
    const wishlist = await this.wishlistModel
      .findOne({ userId })
      .populate('items.productId')
      .exec();

    if (!wishlist) {
      return { userId, items: [] };
    }
    return wishlist;
  }

  async addToWishlist(userId: string, dto: AddWishlistItemDto) {
    let wishlist = await this.wishlistModel.findOne({ userId });

    if (!wishlist) {
      wishlist = new this.wishlistModel({
        userId,
        items: [{ productId: new Types.ObjectId(dto.productId) }],
      });
      return wishlist.save();
    }

    const exists = wishlist.items.some(
      (item) => item.productId.toString() === dto.productId,
    );

    if (!exists) {
      wishlist.items.push({
        productId: new Types.ObjectId(dto.productId),
        addedAt: new Date(),
      });
      await wishlist.save();
    }

    return wishlist;
  }

  async removeFromWishlist(userId: string, productId: string) {
    const wishlist = await this.wishlistModel.findOneAndUpdate(
      { userId },
      { $pull: { items: { productId: new Types.ObjectId(productId) } } },
      { new: true },
    );

    if (!wishlist) {
      throw new NotFoundException('Wishlist not found');
    }

    return wishlist;
  }
}

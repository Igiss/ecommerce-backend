import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from '../database/schemas/cart.schema';
import { Product, ProductDocument, ProductStatus } from '../database/schemas/product.schema';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { getActivePrice } from '../common/helpers/price.helper';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
  ) {}

  async getCart(userId: string) {
    return this.getOrCreateCart(userId);
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const product = await this.productModel
      .findOne({ productId: dto.productId, status: { $ne: ProductStatus.Deleted } })
      .exec();

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const cart = await this.getOrCreateCart(userId);
    const item = cart.items.find((cartItem) => {
      const sameProduct = cartItem.productId.toString() === product._id.toString();
      const sameDesign =
        (cartItem.customDesignId?.toString() || '') === (dto.customDesignId || '');
      return sameProduct && sameDesign;
    });

    if (item) {
      item.quantity += dto.quantity;
    } else {
      cart.items.push({
        productId: product._id,
        customDesignId: dto.customDesignId ? new Types.ObjectId(dto.customDesignId) : undefined,
        quantity: dto.quantity,
        price: getActivePrice(product),
        productName: product.name,
        image: product.images[0],
      });
    }

    return cart.save();
  }

  async updateItem(userId: string, productId: number, dto: UpdateCartItemDto) {
    const product = await this.productModel.findOne({ productId }).select('_id').exec();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const cart = await this.getOrCreateCart(userId);
    const item = cart.items.find(
      (cartItem) => cartItem.productId.toString() === product._id.toString(),
    );

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    item.quantity = dto.quantity;
    return cart.save();
  }

  async removeItem(userId: string, productId: number) {
    const product = await this.productModel.findOne({ productId }).select('_id').exec();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const cart = await this.getOrCreateCart(userId);
    cart.items = cart.items.filter(
      (item) => item.productId.toString() !== product._id.toString(),
    );
    return cart.save();
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    cart.items = [];
    return cart.save();
  }

  private async getOrCreateCart(userId: string) {
    const existingCart = await this.cartModel
      .findOne({ userId })
      .populate('items.productId')
      .populate('items.customDesignId')
      .exec();

    if (existingCart) {
      return existingCart;
    }

    return this.cartModel.create({
      userId: new Types.ObjectId(userId),
      items: [],
    });
  }
}

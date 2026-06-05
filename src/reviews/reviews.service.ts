import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import { Order, OrderDocument } from '../database/schemas/order.schema';
import { Product, ProductDocument } from '../database/schemas/product.schema';
import { Review, ReviewDocument, ReviewStatus } from '../database/schemas/review.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  async create(userId: string, dto: CreateReviewDto) {
    const [product, order] = await Promise.all([
      this.productModel.findById(dto.productId).exec(),
      this.orderModel.findById(dto.orderId).exec(),
    ]);

    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId.toString() !== userId) {
      throw new ForbiddenException('You can only review products from your own orders');
    }

    return this.reviewModel.create({
      ...dto,
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(dto.productId),
      orderId: new Types.ObjectId(dto.orderId),
    });
  }

  async findByProduct(productId: string) {
    return this.reviewModel
      .find({ productId, status: ReviewStatus.Visible })
      .populate('userId', 'fullName avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(id: string, userId: string, dto: UpdateReviewDto) {
    const review = await this.reviewModel.findById(id).exec();
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    if (review.userId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own review');
    }

    Object.assign(review, dto);
    return review.save();
  }

  async remove(id: string, userId: string, role: Role) {
    const review = await this.reviewModel.findById(id).exec();
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (role === Role.User && review.userId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own review');
    }

    review.status = ReviewStatus.Deleted;
    return review.save();
  }
}

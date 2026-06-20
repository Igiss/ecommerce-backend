import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Error as MongooseError, Model, Types } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import { OrderStatus } from '../common/enums/order-status.enum';
import { Order, OrderDocument } from '../database/schemas/order.schema';
import { Product, ProductDocument } from '../database/schemas/product.schema';
import { Review, ReviewDocument, ReviewStatus } from '../database/schemas/review.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { UploadTargetType, UploadType } from '../database/schemas/upload.schema';
import { UploadService } from '../upload/upload.service';
import { ModerateReviewDto } from './dto/moderate-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private readonly reviewModel: Model<ReviewDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly uploadService: UploadService,
  ) {}

  async create(userId: string, dto: CreateReviewDto) {
    const [product, order] = await Promise.all([
      this.productModel.findOne({ productId: dto.productId }).exec(),
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

    if (order.orderStatus !== OrderStatus.Completed) {
      throw new BadRequestException('Only completed orders can be reviewed');
    }

    const purchasedProduct = order.items.some(
      (item) => item.productId?.toString() === product._id.toString(),
    );
    if (!purchasedProduct) {
      throw new BadRequestException('This product was not purchased in the selected order');
    }

    const existingReview = await this.reviewModel.exists({
      userId: new Types.ObjectId(userId),
      productId: product._id,
      orderId: order._id,
    });
    if (existingReview) {
      throw new ConflictException('This product has already been reviewed for this order');
    }

    const reviewObjectId = new Types.ObjectId();
    const { imageUploadIds, ...reviewData } = dto;
    const images = imageUploadIds
      ? await this.uploadService.attachUploads(
          userId,
          imageUploadIds,
          UploadType.ReviewImage,
          UploadTargetType.Review,
          reviewObjectId,
        )
      : [];

    try {
      return await this.reviewModel.create({
        _id: reviewObjectId,
        ...reviewData,
        images,
        userId: new Types.ObjectId(userId),
        productId: product._id,
        orderId: order._id,
      });
    } catch (error) {
      if (error instanceof MongooseError && 'code' in error && error.code === 11000) {
        throw new ConflictException('This product has already been reviewed for this order');
      }
      throw error;
    }
  }

  async findByProduct(productId: number) {
    const product = await this.productModel.findOne({ productId }).select('_id').exec();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.reviewModel
      .find({ productId: product._id, status: ReviewStatus.Visible })
      .populate('userId', 'fullName avatar')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAllForAdmin() {
    return this.reviewModel
      .find()
      .populate('userId', 'fullName email')
      .populate('productId', 'name')
      .sort({ createdAt: -1 })
      .exec();
  }

  async getRatingSummary(productId: number) {
    const product = await this.productModel.findOne({ productId }).select('_id').exec();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const [summary] = await this.reviewModel
      .aggregate<{
        overview: Array<{ averageRating: number; totalReviews: number }>;
        distribution: Array<{ _id: number; count: number }>;
      }>([
        {
          $match: {
            productId: product._id,
            status: ReviewStatus.Visible,
          },
        },
        {
          $facet: {
            overview: [
              {
                $group: {
                  _id: null,
                  averageRating: { $avg: '$rating' },
                  totalReviews: { $sum: 1 },
                },
              },
            ],
            distribution: [
              {
                $group: {
                  _id: '$rating',
                  count: { $sum: 1 },
                },
              },
            ],
          },
        },
      ])
      .exec();

    const overview = summary?.overview[0];
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    for (const item of summary?.distribution || []) {
      if (item._id >= 1 && item._id <= 5) {
        distribution[item._id as keyof typeof distribution] = item.count;
      }
    }

    return {
      productId,
      averageRating: overview ? Math.round(overview.averageRating * 100) / 100 : 0,
      totalReviews: overview?.totalReviews || 0,
      distribution,
    };
  }

  async update(id: string, userId: string, dto: UpdateReviewDto) {
    const review = await this.reviewModel.findById(id).exec();
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    if (review.userId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own review');
    }

    const { imageUploadIds, ...reviewData } = dto;
    Object.assign(review, reviewData);
    if (imageUploadIds) {
      review.images = await this.uploadService.attachUploads(
        userId,
        imageUploadIds,
        UploadType.ReviewImage,
        UploadTargetType.Review,
        review._id,
      );
    }
    return review.save();
  }

  async remove(id: string, userId: string, role: Role) {
    const review = await this.reviewModel.findById(id).exec();
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (role !== Role.Admin && review.userId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own review');
    }

    review.status = ReviewStatus.Deleted;
    if (role === Role.Admin) {
      review.moderatedAt = new Date();
      review.moderatedBy = new Types.ObjectId(userId);
      review.moderationReason = 'Deleted by administrator';
    }
    return review.save();
  }

  async moderate(id: string, moderatorId: string, dto: ModerateReviewDto) {
    const review = await this.reviewModel
      .findByIdAndUpdate(
        id,
        {
          status: dto.status,
          moderationReason: dto.moderationReason,
          moderatedAt: new Date(),
          moderatedBy: new Types.ObjectId(moderatorId),
        },
        { new: true },
      )
      .exec();
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    return review;
  }
}

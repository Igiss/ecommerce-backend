import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../database/schemas/order.schema';
import { Product, ProductSchema } from '../database/schemas/product.schema';
import { Review, ReviewSchema } from '../database/schemas/review.schema';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    UploadModule,
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}

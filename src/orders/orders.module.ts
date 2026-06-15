import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomDesign, CustomDesignSchema } from '../database/schemas/custom-design.schema';
import { Order, OrderSchema } from '../database/schemas/order.schema';
import { Product, ProductSchema } from '../database/schemas/product.schema';
import { OrdersController } from './orders.controller';
import { OwnerOrdersController } from './owner-orders.controller';
import { OrdersService } from './orders.service';
import { CouponsModule } from '../coupons/coupons.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: CustomDesign.name, schema: CustomDesignSchema },
    ]),
    CouponsModule,
  ],
  controllers: [OrdersController, OwnerOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

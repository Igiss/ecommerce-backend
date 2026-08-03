import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesModule } from '../categories/categories.module';
import { Product, ProductSchema } from '../database/schemas/product.schema';
import { Counter, CounterSchema } from '../database/schemas/counter.schema';
import { User, UserSchema } from '../database/schemas/user.schema';
import {
  ProductPriceSchedule,
  ProductPriceScheduleSchema,
} from '../database/schemas/product-price-schedule.schema';
import { ProductsController } from './products.controller';
import { OwnerProductsController } from './owner-products.controller';
import { PriceSchedulesController } from './price-schedules.controller';
import { ProductsService } from './products.service';
import { PriceSchedulerService } from './price-scheduler.service';
import { UploadModule } from '../upload/upload.module';
import { InventoryLogsModule } from '../inventory-logs/inventory-logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Counter.name, schema: CounterSchema },
      { name: User.name, schema: UserSchema },
      { name: ProductPriceSchedule.name, schema: ProductPriceScheduleSchema },
    ]),

    CategoriesModule,
    UploadModule,
    InventoryLogsModule,
  ],
  controllers: [ProductsController, OwnerProductsController, PriceSchedulesController],
  providers: [ProductsService, PriceSchedulerService],
  exports: [ProductsService, PriceSchedulerService],
})
export class ProductsModule {}

